// @ts-check
const { spawn, dispatch, Ref } = require('nact');
const { get_distance, set_location } = require('./location');
const { CompanyMsg, CourierMsg, OrderMsg } = require('./msg');
const deep_copy = require('./utlis');

/**
 * @template T
 * @typedef {import('./msg').Msg<T>} Msg
 */

/**
 * @typedef {Object} Plan
 * @prop {Ref<Msg<any>>} courier
 * @prop {string} courier_name
 * @prop {number} total
 * @prop {number} slot
 */

/**
 * @typedef {Object} SchedulePlan
 * @prop {Ref<Msg<any>>} courier
 * @prop {string} courier_name
 * @prop {number} total
 * @prop {number} slot
 * @prop {import('./courier').Plan[]} schedule
 */

/**
 * @typedef {Object} OrderState
 * @prop {import('./location').Location} from
 * @prop {import('./location').Location} to
 * @prop {number} weight
 * @prop {number} price
 * @prop {Plan|null} plan
 * @prop {number} num_couriers
 * @prop {(Plan|SchedulePlan|null)[]} plans
 */

/** @type {OrderState} */
const INIT_STATE = {
    from: set_location(0, 0),
    to: set_location(0, 0),
    weight: 0,
    price: 0,
    plan: null,
    num_couriers: 0,
    plans: []
};

/**
 * @param {Ref<Msg<any>>} parent
 * @param {number} id
 * @param {OrderState} init
 * @returns {Ref<Msg<any>>}
 */
function spawn_order(parent, id, init = INIT_STATE) {
    /**
     * @param {OrderState} state
     * @param {Msg<any>} msg
     * @param {import('nact').ActorContext<Msg<any>, Ref<Msg<any>>>} ctx
     * @returns {OrderState}
     */
    function receiver(state = init, msg, ctx) {
        switch (msg.name) {
            case OrderMsg.RECEIVE_COURIER_PLAN: {
                const _state = deep_copy(state);
                _state.plans.push(msg.value);
                if (_state.plans.length === _state.num_couriers) {
                    dispatch(ctx.self, { name: OrderMsg.PLAN_ORDER, value: null });
                }
                return _state;
            }
            case OrderMsg.RECEIVE_COURIER_REPLACE_PLAN: {
                const _state = deep_copy(state);
                _state.plans.push(msg.value);
                if (_state.plans.length === _state.num_couriers) {
                    dispatch(ctx.self, { name: OrderMsg.PLAN_REPLACING_ORDER, value: null });
                }
                return _state;
            }
            case OrderMsg.FIND_COURIERS: {
                if (state.plan != null) {
                    break;
                }
                const _state = deep_copy(state);
                _state.num_couriers = msg.value.length;
                _state.plans = [];
                msg.value.forEach(c =>
                    dispatch(c, {
                        name: CourierMsg.CAN_PLAN,
                        value: {
                            id: ctx.name,
                            weight: _state.weight,
                            price: _state.price,
                            from: _state.from,
                            to: _state.to
                        },
                        sender: ctx.self
                    })
                );
                return _state;
            }
            case OrderMsg.FIND_COURIERS_TO_REPLACE: {
                const _state = deep_copy(state);
                const num_couriers = msg.value.length;
                const plans = [];
                msg.value.forEach(c =>
                    dispatch(c, {
                        name: CourierMsg.CAN_REPLACE,
                        value: {
                            id: ctx.name,
                            weight: _state.weight,
                            price: _state.price,
                            from: _state.from,
                            to: _state.to
                        },
                        sender: ctx.self
                    })
                );
                return { ..._state, num_couriers, plans };
            }
            case OrderMsg.PLAN_ORDER: {
                const _state = deep_copy(state);
                const plans = /** @type {Plan[]} */ (_state.plans.filter(Boolean));
                const plan = plans.sort((a, b) => a.total - b.total).at(-1);
                if (plan != null && plan.total > 0) {
                    dispatch(plan.courier, {
                        name: CourierMsg.ACCEPT_PLAN,
                        value: {
                            order: ctx.self,
                            order_id: ctx.name,
                            total: plan.total,
                            from: _state.from,
                            to: _state.to,
                            slot: plan.slot,
                            price: _state.price
                        }
                    });
                    return { ..._state, plan };
                }
                dispatch(parent, {
                    name: CompanyMsg.ADJUST_SCHEDULE,
                    value: null,
                    sender: ctx.self
                });
                break;
            }
            case OrderMsg.PLAN_REPLACING_ORDER: {
                const _state = deep_copy(state);
                const plans = /** @type {SchedulePlan[]} */ (_state.plans.filter(Boolean));
                const plan = plans
                    .sort(
                        (a, b) =>
                            a.schedule.reduce((acc, plan) => acc + plan.total, 0) -
                            b.schedule.reduce((acc, plan) => acc + plan.total, 0)
                    )
                    .at(-1);
                if (plan != null && plan.total > 0) {
                    dispatch(plan.courier, {
                        name: CourierMsg.ACCEPT_REPLACE_PLAN,
                        value: plan.schedule
                    });
                    _state.plan = {
                        courier: plan.courier,
                        total: plan.total,
                        courier_name: plan.courier_name,
                        slot: plan.slot
                    };
                    return _state;
                }
                dispatch(parent, {
                    name: CompanyMsg.NOT_PLANNED_ORDER,
                    value: { id: ctx.name },
                    sender: ctx.self
                });
                break;
            }
            case OrderMsg.UPDATE_PLAN: {
                const _state = deep_copy(state);
                if (_state.plan == null) {
                    break;
                }
                _state.plan.total = msg.value;
                return _state;
            }
            case OrderMsg.DISCARD: {
                const _state = deep_copy(state);
                dispatch(parent, { name: CompanyMsg.CREATE_PLAN, value: null });
                _state.plan = null;
                return _state;
            }
            case OrderMsg.LOG: {
                console.log(
                    `Заказ (${ctx.name}) ${state.from.coords} -> (${get_distance(
                        state.from,
                        state.to
                    ).toFixed(2)} км / ${state.weight} кг) | Цена: ${state.price.toFixed(2)} | ${
                        state.plan != null
                            ? `Запланирован на курьера - ${state.plan.courier_name}`
                            : 'Не запланирован'
                    }`
                );
                break;
            }
        }
        return state;
    }

    return spawn(parent, receiver, `order-${id}`);
}

module.exports = spawn_order;
