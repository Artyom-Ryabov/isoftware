// @ts-check
const { spawn, dispatch, Ref } = require('nact');
const { get_distance, set_location } = require('./location');
const { CompanyMsg, CourierMsg, OrderMsg } = require('./msg');
const { deep_copy } = require('./utlis');

/**
 * @typedef {import('./location').Location} Location
 */

/**
 * @typedef {import('./msg').Msg} Msg
 * @typedef {import('./msg').CourierPlan} CourierPlan
 * @typedef {import('./msg').OrderPlan} OrderPlan
 */

/**
 * @typedef {import('nact').ActorContext<Msg, Ref<Msg>>} ActorContext
 */

/**
 * @typedef {Object} OrderState
 * @prop {Location} from
 * @prop {Location} to
 * @prop {number} weight
 * @prop {number} price
 * @prop {OrderPlan|null} order_plan
 * @prop {number} num_couriers
 * @prop {OrderPlan[]} order_plans
 * @prop {boolean} lock
 */

/** @type {OrderState} */
const INIT_STATE = {
    from: set_location(0, 0),
    to: set_location(0, 0),
    weight: 0,
    price: 0,
    order_plan: null,
    num_couriers: 0,
    order_plans: [],
    lock: false
};

/**
 * @param {Ref<Msg>} parent
 * @param {number} id
 * @param {OrderState} init
 * @returns {Ref<Msg>}
 */
function spawn_order(parent, id, init = INIT_STATE) {
    /**
     * @param {OrderState} state
     * @param {Msg} msg
     * @param {ActorContext} ctx
     * @returns {OrderState}
     */
    function receiver(state = init, msg, ctx) {
        switch (msg.name) {
            case OrderMsg.RECEIVE_COURIER_PLAN: {
                const st = deep_copy(state);
                st.order_plans.push({ courier_ref: msg.sender, courier: msg.value });
                if (st.order_plans.length === st.num_couriers) {
                    dispatch(ctx.self, {
                        name: OrderMsg.PLAN_ORDER,
                        value: null,
                        sender: ctx.self
                    });
                }
                return st;
            }
            case OrderMsg.RECEIVE_COURIER_REPLACE_PLAN: {
                const st = deep_copy(state);
                st.order_plans.push({ courier_ref: msg.sender, courier: msg.value });
                if (st.order_plans.length === st.num_couriers) {
                    dispatch(ctx.self, {
                        name: OrderMsg.PLAN_REPLACING_ORDER,
                        value: null,
                        sender: ctx.self
                    });
                }
                return st;
            }
            case OrderMsg.FIND_COURIERS: {
                if (state.lock || state.order_plan != null) {
                    break;
                }
                const st = deep_copy(state);
                st.num_couriers = msg.value.length;
                st.order_plans = [];
                st.lock = true;
                msg.value.forEach(c =>
                    dispatch(c, {
                        name: CourierMsg.CAN_PLAN,
                        value: {
                            id: ctx.name,
                            weight: st.weight,
                            price: st.price,
                            from: st.from,
                            to: st.to
                        },
                        sender: ctx.self
                    })
                );
                return st;
            }
            case OrderMsg.FIND_COURIERS_TO_REPLACE: {
                if (state.lock || state.order_plan != null) {
                    break;
                }
                const st = deep_copy(state);
                st.num_couriers = msg.value.length;
                st.order_plans = [];
                st.lock = true;
                msg.value.forEach(c =>
                    dispatch(c, {
                        name: CourierMsg.CAN_REPLACE,
                        value: {
                            id: ctx.name,
                            weight: st.weight,
                            price: st.price,
                            from: st.from,
                            to: st.to
                        },
                        sender: ctx.self
                    })
                );
                return st;
            }
            case OrderMsg.PLAN_ORDER: {
                const st = deep_copy(state);
                const order_plans = /** @type {OrderPlan[]} */ (
                    st.order_plans.filter(p => p.courier != null)
                );
                const plan = order_plans.sort((a, b) => a.courier.total - b.courier.total).at(-1);
                if (plan != null) {
                    dispatch(plan.courier_ref, {
                        name: CourierMsg.ACCEPT_PLAN,
                        value: {
                            schedule: plan.courier.schedule,
                            total: plan.courier.total
                        },
                        sender: ctx.self
                    });
                } else {
                    dispatch(parent, {
                        name: CompanyMsg.ADJUST_SCHEDULE,
                        value: null,
                        sender: ctx.self
                    });
                }
                st.order_plan = plan ?? null;
                st.order_plans = [];
                st.lock = false;
                return st;
            }
            case OrderMsg.PLAN_REPLACING_ORDER: {
                const st = deep_copy(state);
                const order_plans = /** @type {OrderPlan[]} */ (
                    st.order_plans.filter(p => p.courier != null)
                );
                const plan = order_plans.sort((a, b) => a.courier.total - b.courier.total).at(-1);
                if (plan != null) {
                    dispatch(plan.courier_ref, {
                        name: CourierMsg.ACCEPT_REPLACE_PLAN,
                        value: {
                            schedule: plan.courier.schedule,
                            total: plan.courier.total
                        },
                        sender: ctx.self
                    });
                } else {
                    dispatch(parent, {
                        name: CompanyMsg.NOT_PLANNED_ORDER,
                        value: { id: ctx.name },
                        sender: ctx.self
                    });
                }
                st.order_plan = plan ?? null;
                st.order_plans = [];
                st.lock = false;
                return st;
            }
            // case OrderMsg.UPDATE_PLAN: {
            //     const _state = deep_copy(state);
            //     if (_state.plan == null) {
            //         break;
            //     }
            //     _state.plan.total = msg.value;
            //     return _state;
            // }
            case OrderMsg.DISCARD: {
                const st = deep_copy(state);
                dispatch(parent, { name: CompanyMsg.CREATE_PLAN, value: null, sender: ctx.self });
                st.order_plan = null;
                st.order_plans = [];
                st.lock = false;
                return st;
            }
            case OrderMsg.LOG: {
                console.log(
                    `Заказ (${ctx.name}) ${state.from.x},${state.from.y} -> (${get_distance(
                        state.from,
                        state.to
                    ).toFixed(2)} км / ${state.weight} кг) | Цена: ${state.price.toFixed(2)} | ${
                        state.order_plan != null
                            ? `Запланирован на курьера - ${state.order_plan.courier.name}`
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
