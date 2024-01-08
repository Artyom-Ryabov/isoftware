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
 * @typedef {import('./msg').Plan} Plan
 * @typedef {import('./msg').OrderPlan} OrderPlan
 * @typedef {import('./msg').CourierSchedule} CourierSchedule
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
 * @prop {CourierSchedule[]} courier_schedules
 * @prop {boolean} in_process
 */

/** @type {OrderState} */
const INIT_STATE = {
    from: set_location(0, 0),
    to: set_location(0, 0),
    weight: 0,
    price: 0,
    order_plan: null,
    num_couriers: 0,
    courier_schedules: [],
    in_process: false
};

/**
 * @param {Ref<Msg>} parent
 * @param {string} id
 * @param {OrderState} init
 * @returns {Ref<Msg>}
 */
function spawn_order(parent, id, init = INIT_STATE) {
    let locked = false;
    /**
     * @param {OrderState} state
     * @param {Msg} msg
     * @param {ActorContext} ctx
     * @returns {OrderState}
     */
    function receiver(state = init, msg, ctx) {
        switch (msg.name) {
            case OrderMsg.NOTIFY: {
                // Оповещение для не добавленного заказа при появлении нового курьера

                locked = false;
                if (!state.in_process && state.order_plan == null) {
                    dispatch(parent, {
                        name: CompanyMsg.CREATE_PLAN,
                        value: null,
                        sender: ctx.self
                    });
                }
                break;
            }
            case OrderMsg.FIND_COURIERS: {
                // Рассылка всем курьерам по добавлению заказа

                if (state.in_process || state.order_plan != null) {
                    break;
                }
                const st = deep_copy(state);
                st.num_couriers = msg.value.length;
                st.courier_schedules = [];
                st.in_process = true;
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
                // Рассылка всем курьерам по замене заказа

                if (state.in_process || state.order_plan != null) {
                    break;
                }
                const st = deep_copy(state);
                st.num_couriers = msg.value.length;
                st.courier_schedules = [];
                st.in_process = true;
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
            case OrderMsg.RECEIVE_COURIER_PLAN: {
                // Сбор расписаний (по добавлению заказа) со всех курьеров

                const st = deep_copy(state);
                st.courier_schedules.push({ courier_ref: msg.sender, schedule: msg.value });
                if (st.courier_schedules.length === st.num_couriers) {
                    dispatch(ctx.self, {
                        name: OrderMsg.PLAN_ORDER,
                        value: null,
                        sender: ctx.self
                    });
                }
                return st;
            }
            case OrderMsg.RECEIVE_COURIER_REPLACE_PLAN: {
                // Сбор расписаний (по замене заказа) со всех курьеров

                const st = deep_copy(state);
                st.courier_schedules.push({ courier_ref: msg.sender, schedule: msg.value });
                if (st.courier_schedules.length === st.num_couriers) {
                    dispatch(ctx.self, {
                        name: OrderMsg.PLAN_REPLACING_ORDER,
                        value: null,
                        sender: ctx.self
                    });
                }
                return st;
            }
            case OrderMsg.PLAN_ORDER: {
                // Выбор лучшего расписания (по добавлению заказа) среди курьеров

                const st = deep_copy(state);
                const courier_schedules = /** @type {CourierSchedule[]} */ (
                    st.courier_schedules.filter(p => p.schedule != null)
                );
                const courier_schedule = courier_schedules
                    .sort((a, b) => a.schedule.total - b.schedule.total)
                    .at(-1);
                if (courier_schedule != null) {
                    dispatch(courier_schedule.courier_ref, {
                        name: CourierMsg.ACCEPT_PLAN,
                        value: {
                            order_id: ctx.name,
                            plans: courier_schedule.schedule.plans,
                            total: courier_schedule.schedule.total
                        },
                        sender: ctx.self
                    });
                    break;
                }
                dispatch(parent, {
                    name: CompanyMsg.ADJUST_SCHEDULE,
                    value: null,
                    sender: ctx.self
                });
                st.in_process = false;
                return st;
            }
            case OrderMsg.PLAN_REPLACING_ORDER: {
                // Выбор лучшего расписания (по замене заказа) среди курьеров

                const st = deep_copy(state);
                const courier_schedules = /** @type {CourierSchedule[]} */ (
                    st.courier_schedules.filter(p => p.schedule != null)
                );
                const courier_schedule = courier_schedules
                    .sort((a, b) => a.schedule.total - b.schedule.total)
                    .at(-1);
                if (courier_schedule != null) {
                    dispatch(courier_schedule.courier_ref, {
                        name: CourierMsg.ACCEPT_REPLACE_PLAN,
                        value: {
                            order_id: ctx.name,
                            plans: courier_schedule.schedule.plans,
                            total: courier_schedule.schedule.total
                        },
                        sender: ctx.self
                    });
                    break;
                }
                dispatch(parent, {
                    name: CompanyMsg.NOT_PLANNED_ORDER,
                    value: { id: ctx.name },
                    sender: ctx.self
                });
                st.in_process = false;
                return st;
            }
            case OrderMsg.ACCEPT_PLAN: {
                // Добавить к заказу план

                const st = deep_copy(state);
                dispatch(parent, {
                    name: CompanyMsg.RECEIVE_PLAN,
                    value: {
                        order: ctx.name,
                        courier: msg.value.name,
                        income: msg.value.plan.income
                    },
                    sender: ctx.self
                });
                st.order_plan =
                    { courier: { ref: msg.sender, name: msg.value.name }, plan: msg.value.plan } ??
                    null;
                st.courier_schedules = [];
                st.in_process = false;
                return st;
            }
            case OrderMsg.REMOVE: {
                // Убрать заказ (при замене заказа, при более выгодном расписании курьера)

                // Временное окно, чтобы заказ мог распределиться
                if (locked) {
                    break;
                }
                setTimeout(() => (locked = true), 1000);
                locked = false;

                dispatch(parent, {
                    name: CompanyMsg.CREATE_PLAN,
                    value: ctx.name,
                    sender: ctx.self
                });
                const st = deep_copy(state);
                st.order_plan = null;
                st.courier_schedules = [];
                st.in_process = false;
                return st;
            }
            case OrderMsg.DISCARD: {
                // Сброс заказа

                if (state.order_plan != null) {
                    dispatch(state.order_plan.courier.ref, {
                        name: CourierMsg.REMOVE_ORDER,
                        value: ctx.name,
                        sender: ctx.self
                    });
                    const st = deep_copy(state);
                    st.order_plan = null;
                    st.courier_schedules = [];
                    st.in_process = false;
                    return st;
                }
                dispatch(parent, {
                    name: CompanyMsg.APPLY_DISCARD_COURIER,
                    value: ctx.name,
                    sender: ctx.self
                });
                break;
            }
            case OrderMsg.LOG: {
                // Вывод информации о заказе в консоль

                console.log(
                    `Заказ - ${ctx.name} | Находится в ${state.from.x},${
                        state.from.y
                    } -> (${get_distance(state.from, state.to).toFixed(2)} км / ${
                        state.weight
                    } кг) | Цена: ${state.price.toFixed(2)} | ${
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

    return spawn(parent, receiver, id);
}

module.exports = spawn_order;
