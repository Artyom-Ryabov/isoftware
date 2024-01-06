// @ts-check
const { spawn, dispatch, Ref } = require('nact');
const { set_location } = require('./location');
const { CompanyMsg, CourierMsg, OrderMsg } = require('./msg');
const { deep_copy, find_combinations, calc_price, calc_total } = require('./utlis');

/**
 * @typedef {import('./location').Location} Location
 */

/**
 * @typedef {import('./msg').Msg} Msg
 * @typedef {import('./msg').MsgOrder} MsgOrder
 * @typedef {import('./msg').Order} Order
 * @typedef {import('./msg').CourierPlan} CourierPlan
 * @typedef {import('./msg').TotalPlan} TotalPlan
 */

/**
 * @typedef {import('nact').ActorContext<Msg, Ref<Msg>>} ActorContext
 */

/**
 * @typedef {Object} CourierState
 * @prop {string} name
 * @prop {Location} location
 * @prop {number} lift
 * @prop {number} workload
 * @prop {number} cost
 * @prop {number} total
 * @prop {CourierPlan[]} schedule
 * @prop {Ref<Msg>|null} prev_order_ref
 */

/** @type {CourierState} */
const INIT_STATE = {
    name: '',
    location: set_location(0, 0),
    lift: 0,
    workload: 0,
    cost: 0,
    total: 0,
    schedule: [],
    prev_order_ref: null
};

/**
 * @typedef {Object} TheoreticalPlan
 * @prop {Ref<Msg>} order_ref
 * @prop {Order} order
 */

/**
 * @param {CourierPlan[]} old_schedule
 * @param {TheoreticalPlan} plan
 * @param {Location} location
 * @param {number} cost
 * @returns {[CourierPlan[]|null, number]}
 */
function calc_schedule(old_schedule, plan, location, cost) {
    /** @type {TheoreticalPlan[]} */
    const plans = old_schedule.map(p => ({
        order_ref: p.order_ref,
        order: p.order
    }));
    plans.push(plan);
    const variants = find_combinations(plans);
    /** @type {CourierPlan[]|null} */
    let new_schedule = null;
    let highest = 0;
    for (const variant of variants) {
        /** @type {CourierPlan[]} */
        const schedule = variant.map((v, idx) => ({
            ...v,
            income: calc_price(idx === 0 ? location : variant[idx - 1].order.to, v.order, cost)
        }));
        const total = calc_total(location, schedule, cost);
        if (total > highest) {
            highest = total;
            new_schedule = schedule;
        }
    }
    return [new_schedule, highest];
}

/**
 * @param {Ref<Msg>} parent
 * @param {number} id
 * @param {CourierState} init
 * @returns {Ref<Msg>}
 */
function spawn_courier(parent, id, init = INIT_STATE) {
    /**
     * @param {CourierState} state
     * @param {Msg} msg
     * @param {ActorContext} ctx
     * @returns {CourierState}
     */
    function receiver(state = init, msg, ctx) {
        switch (msg.name) {
            case CourierMsg.CAN_PLAN: {
                const msg_value = /** @type {Order} */ (msg.value);
                if (msg_value.weight > state.lift || state.workload === state.schedule.length) {
                    dispatch(msg.sender, {
                        name: OrderMsg.RECEIVE_COURIER_PLAN,
                        value: null,
                        sender: ctx.self
                    });
                    break;
                }
                const st = deep_copy(state);
                const [schedule, total] = calc_schedule(
                    st.schedule,
                    { order_ref: msg.sender, order: msg_value },
                    st.location,
                    st.cost
                );
                if (schedule == null) {
                    dispatch(msg.sender, {
                        name: OrderMsg.RECEIVE_COURIER_PLAN,
                        value: null,
                        sender: ctx.self
                    });
                    break;
                }
                dispatch(msg.sender, {
                    name: OrderMsg.RECEIVE_COURIER_PLAN,
                    value: {
                        name: st.name,
                        schedule,
                        total
                    },
                    sender: ctx.self
                });
                break;
            }
            case CourierMsg.CAN_REPLACE: {
                const msg_value = /** @type {Order} */ (msg.value);
                if (msg_value.weight > state.lift) {
                    dispatch(msg.sender, {
                        name: OrderMsg.RECEIVE_COURIER_REPLACE_PLAN,
                        value: null,
                        sender: ctx.self
                    });
                    break;
                }
                const st = deep_copy(state);
                const variants = [];
                for (let i = 0; i < st.schedule.length; i++) {
                    const sch = deep_copy(st.schedule);
                    sch.splice(i, 1);
                    const [schedule, total] = calc_schedule(
                        sch,
                        { order_ref: msg.sender, order: msg_value },
                        st.location,
                        st.cost
                    );
                    if (schedule != null) {
                        variants.push({ index: i, schedule, total });
                    }
                }
                const best = variants.sort((a, b) => a.total - b.total).at(-1);
                if (best == null) {
                    dispatch(msg.sender, {
                        name: OrderMsg.RECEIVE_COURIER_REPLACE_PLAN,
                        value: null,
                        sender: ctx.self
                    });
                    break;
                }
                dispatch(msg.sender, {
                    name: OrderMsg.RECEIVE_COURIER_REPLACE_PLAN,
                    value: {
                        name: st.name,
                        schedule: best.schedule,
                        total: best.total
                    },
                    sender: ctx.self
                });
                st.prev_order_ref = st.schedule[best.index].order_ref;
                return st;
            }
            case CourierMsg.ACCEPT_PLAN: {
                const msg_value = /** @type {TotalPlan} */ (msg.value);
                const st = deep_copy(state);
                if (
                    msg_value.total <= st.total ||
                    msg_value.schedule.length <= st.schedule.length
                ) {
                    dispatch(msg.sender, {
                        name: OrderMsg.DISCARD,
                        value: null,
                        sender: ctx.self
                    });
                    break;
                }
                dispatch(parent, {
                    name: CompanyMsg.RECEIVE_PLAN,
                    value: { name: st.name, schedule: msg_value.schedule, total: msg_value.total },
                    sender: ctx.self
                });
                st.total = msg_value.total;
                st.schedule = msg_value.schedule;
                st.prev_order_ref = msg.sender;
                return st;
            }
            case CourierMsg.ACCEPT_REPLACE_PLAN: {
                const msg_value = /** @type {TotalPlan} */ (msg.value);
                const st = deep_copy(state);
                if (msg_value.total <= st.total) {
                    dispatch(msg.sender, {
                        name: OrderMsg.DISCARD,
                        value: null,
                        sender: ctx.self
                    });
                    break;
                }
                if (st.prev_order_ref != null) {
                    dispatch(st.prev_order_ref, {
                        name: OrderMsg.DISCARD,
                        value: null,
                        sender: ctx.self
                    });
                    st.prev_order_ref = msg.sender;
                }
                st.total = msg_value.total;
                st.schedule = msg_value.schedule;
                return st;
            }
            case CourierMsg.LOG: {
                console.log(
                    `\nКурьер: ${state.name} | Грузоподъемность: ${state.lift} | Находится в ${state.location.x},${state.location.y}`
                );
                if (state.schedule.length > 0) {
                    console.log('\tРасписание:');
                    state.schedule.forEach(p =>
                        console.log(
                            `\t- Заказ (${p.order.id}) -> Цена: ${p.income.toFixed(
                                2
                            )}, Цена заказа: ${p.order.price.toFixed(2)}`
                        )
                    );
                    console.log(`Общий заработок за расписание: ${state.total.toFixed(2)}`);
                }
                console.log(
                    '---------------------------------------------------------------------------------------------------------------------------'
                );
                break;
            }
        }
        return state;
    }

    return spawn(parent, receiver, `courier-${id}`);
}

module.exports = spawn_courier;
