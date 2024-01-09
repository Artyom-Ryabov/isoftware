// @ts-check

const { spawn, dispatch, Ref } = require('nact');
const { set_location } = require('../lib/location');
const { CompanyMsg, CourierMsg, OrderMsg } = require('./msg');
const { deep_copy, find_combinations, calc_price, calc_total } = require('../lib/utlis');

/**
 * @typedef {import('../lib/location').Location} Location
 */

/**
 * @typedef {import('./msg').Msg} Msg
 * @typedef {import('./msg').Order} Order
 * @typedef {import('./msg').Plan} Plan
 * @typedef {import('./msg').Schedule} Schedule
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
 * @prop {Plan[]} schedule
 * @prop {Ref<Msg>|null} discard_ref
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
    discard_ref: null
};

/**
 * @typedef {Object} TheoreticalPlan
 * @prop {Ref<Msg>} order_ref
 * @prop {Order} order
 */

/**
 * @param {Plan[]} old_schedule
 * @param {TheoreticalPlan|null} plan
 * @param {Location} location
 * @param {number} cost
 * @returns {[Plan[]|null, number]}
 */
function calc_schedule(old_schedule, plan, location, cost) {
    /** @type {TheoreticalPlan[]} */
    const plans = old_schedule.map(p => ({
        order_ref: p.order_ref,
        order: p.order
    }));
    if (plan != null) {
        plans.push(plan);
    }
    const variants = find_combinations(plans);
    /** @type {Plan[]|null} */
    let new_schedule = null;
    let highest = 0;
    for (const variant of variants) {
        /** @type {Plan[]} */
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
 * @param {string} id
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
                // Обработка нового заказа на добавление

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
                dispatch(msg.sender, {
                    name: OrderMsg.RECEIVE_COURIER_PLAN,
                    value:
                        schedule != null
                            ? {
                                  plans: schedule,
                                  total
                              }
                            : null,
                    sender: ctx.self
                });
                break;
            }
            case CourierMsg.CAN_REPLACE: {
                // Обработка нового заказа на замену

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
                        plans: best.schedule,
                        total: best.total
                    },
                    sender: ctx.self
                });
                st.discard_ref = st.schedule[best.index].order_ref;
                return st;
            }
            case CourierMsg.ACCEPT_PLAN: {
                // Принять новое расписание с добавлением заказа

                const msg_value = /** @type {Schedule} */ (msg.value);
                const st = deep_copy(state);
                if (msg_value.total <= st.total || msg_value.plans.length <= st.schedule.length) {
                    dispatch(msg.sender, {
                        name: OrderMsg.DISCARD,
                        value: null,
                        sender: ctx.self
                    });
                    break;
                }
                dispatch(msg.sender, {
                    name: OrderMsg.ACCEPT_PLAN,
                    value: {
                        name: st.name,
                        plan: msg_value.plans.find(p => p.order.id === msg_value.order_id)
                    },
                    sender: ctx.self
                });
                st.total = msg_value.total;
                st.schedule = msg_value.plans;
                st.discard_ref = msg.sender;
                return st;
            }
            case CourierMsg.ACCEPT_REPLACE_PLAN: {
                // Принять новое расписание с заменой заказа

                const msg_value = /** @type {Schedule} */ (msg.value);
                const st = deep_copy(state);
                if (msg_value.total <= st.total) {
                    dispatch(msg.sender, {
                        name: OrderMsg.DISCARD,
                        value: null,
                        sender: ctx.self
                    });
                    break;
                }
                if (st.discard_ref != null) {
                    dispatch(st.discard_ref, {
                        name: OrderMsg.DISCARD,
                        value: null,
                        sender: ctx.self
                    });
                }
                dispatch(msg.sender, {
                    name: OrderMsg.ACCEPT_PLAN,
                    value: {
                        name: st.name,
                        plan: msg_value.plans.find(p => p.order.id === msg_value.order_id)
                    },
                    sender: ctx.self
                });
                st.total = msg_value.total;
                st.schedule = msg_value.plans;
                st.discard_ref = msg.sender;
                return st;
            }
            case CourierMsg.DISCARD_ORDER: {
                // Убрать заказ из расписания

                const st = deep_copy(state);
                st.schedule = st.schedule.filter(s => s.order.id !== msg.value);
                const [schedule, total] = calc_schedule(st.schedule, null, st.location, st.cost);
                if (schedule != null) {
                    st.schedule = schedule;
                    st.total = total;
                }
                dispatch(msg.sender, { name: OrderMsg.REMOVE, value: null, sender: ctx.self });
                return st;
            }
            case CourierMsg.REMOVE: {
                // Удалить курьера

                const st = deep_copy(state);
                dispatch(parent, {
                    name: CompanyMsg.APPLY_REMOVE_COURIER,
                    value: ctx.name,
                    sender: ctx.self
                });
                st.schedule.forEach(p =>
                    dispatch(p.order_ref, { name: OrderMsg.DISCARD, value: null, sender: ctx.self })
                );
                st.schedule = [];
                st.discard_ref = null;
                return st;
            }
            case CourierMsg.LOG: {
                // Вывод информации о курьере в консоль

                console.log(
                    `\n${msg.value ? '' : '(НЕДОСТУПЕН) '}Курьер: ${state.name} | Грузоподъемность: ${state.lift} | Находится в ${state.location.x},${state.location.y}`
                );
                if (state.schedule.length > 0) {
                    console.log('\tРасписание:');
                    state.schedule.forEach(p =>
                        console.log(
                            `\t- Заказ (${p.order.id}) -> Выгода: ${p.income.toFixed(
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

    return spawn(parent, receiver, id);
}

module.exports = spawn_courier;
