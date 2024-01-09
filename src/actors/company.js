// @ts-check

const { spawn, dispatch, Ref, stop } = require('nact');
const { CompanyMsg, CourierMsg, OrderMsg } = require('./msg');
const spawn_order = require('./order');
const spawn_courier = require('./courier');
const { deep_copy } = require('../lib/utlis');

/**
 * @typedef {import('./msg').Msg} Msg
 */

/**
 * @typedef {import('nact').ActorContext<Msg, Ref<Msg>>} ActorContext
 */

/**
 * @typedef {Object} Actor
 * @prop {number} id
 * @prop {Ref<Msg>} ref
 * @prop {boolean} active
 */

/**
 * @typedef {Object} CompanyState
 * @prop {Actor[]} couriers
 * @prop {Actor[]} orders
 */

/** @type {CompanyState} */
const INIT_STATE = { orders: [], couriers: [] };

/**
 * @param {Ref<Msg>} parent
 * @param {string} id
 * @param {CompanyState} init
 * @returns {Ref<Msg>}
 */
function spawn_company(parent, id, init = INIT_STATE) {
    /**
     * @param {CompanyState} state
     * @param {Msg} msg
     * @param {ActorContext} ctx
     * @returns {CompanyState}
     */
    function receiver(state = init, msg, ctx) {
        switch (msg.name) {
            case CompanyMsg.CREATE_COURIER: {
                // Добавление нового курьера в систему

                const st = deep_copy(state);
                const courier = {
                    id: msg.value.id,
                    ref: spawn_courier(ctx.self, msg.value.id, msg.value.init_state),
                    active: true
                };
                st.couriers.push(courier);
                dispatch(ctx.self, {
                    name: CompanyMsg.NOTIFY_ORDERS,
                    value: null,
                    sender: ctx.self
                });
                return st;
            }
            case CompanyMsg.CREATE_ORDER: {
                // Добавление нового заказа в систему

                const st = deep_copy(state);
                const order = {
                    id: msg.value.id,
                    ref: spawn_order(ctx.self, msg.value.id, msg.value.init_state),
                    active: true
                };
                st.orders.push(order);
                dispatch(order.ref, {
                    name: OrderMsg.FIND_COURIERS,
                    value: state.couriers.filter(c => c.active).map(c => c.ref),
                    sender: ctx.self
                });
                return st;
            }
            case CompanyMsg.NOTIFY_ORDERS: {
                // Оповестить заказы для распределения по всем курьерам

                state.orders
                    .filter(o => o.active)
                    .forEach(o =>
                        dispatch(o.ref, {
                            name: OrderMsg.NOTIFY,
                            value: null,
                            sender: ctx.self
                        })
                    );
                break;
            }
            case CompanyMsg.CREATE_PLAN: {
                // Распределить заказ

                dispatch(msg.sender, {
                    name: OrderMsg.FIND_COURIERS,
                    value: state.couriers.filter(c => c.active).map(c => c.ref),
                    sender: ctx.self
                });
                break;
            }
            case CompanyMsg.RECEIVE_PLAN: {
                // Вывод сообщения о добавлении заказа в расписание курьера

                console.log(
                    `Заказ - ${msg.value.order}, запланирован на курьера - ${
                        msg.value.courier
                    } с прибылью: ${msg.value.income.toFixed(2)}`
                );
                break;
            }
            case CompanyMsg.ADJUST_SCHEDULE: {
                // Если заказ не смог добавиться к какому либо расписанию курьера, то запускается процесс по замене заказ

                dispatch(msg.sender, {
                    name: OrderMsg.FIND_COURIERS_TO_REPLACE,
                    value: state.couriers.filter(c => c.active).map(c => c.ref),
                    sender: ctx.self
                });
                break;
            }
            case CompanyMsg.NOT_PLANNED_ORDER: {
                // Вывод сообщения о невозможности запланировать заказ

                console.log(`Заказ (${msg.value.id}) не запланирован`);
                break;
            }
            case CompanyMsg.ACTIVATE_COURIER: {
                // Восстановить курьера

                const st = deep_copy(state);
                const courier = st.couriers.filter(c => !c.active).find(c => c.id === msg.value);
                if (courier != null) {
                    courier.active = true;
                    dispatch(ctx.self, {
                        name: CompanyMsg.NOTIFY_ORDERS,
                        value: null,
                        sender: ctx.self
                    });
                    console.log(`Курьер с id = ${msg.value} восстановлен`);
                    return st;
                }
                console.log(`Курьер с id = ${msg.value} не найден или не требует восстановления`);
                break;
            }
            case CompanyMsg.ACTIVATE_ORDER: {
                // Восстановить заказ

                const st = deep_copy(state);
                const order = st.orders.filter(o => !o.active).find(o => o.id === msg.value);
                if (order != null) {
                    order.active = true;
                    dispatch(order.ref, { name: OrderMsg.NOTIFY, value: null, sender: ctx.self });
                    console.log(`Заказ с id = ${msg.value} восстановлен`);
                    return st;
                }
                console.log(`Заказ с id = ${msg.value} не найден или не требует восстановления`);
                break;
            }
            case CompanyMsg.REMOVE_COURIER: {
                // Убрать курьера из списка доступных

                const courier = state.couriers.filter(c => c.active).find(c => c.id === msg.value);
                if (courier != null) {
                    dispatch(courier.ref, {
                        name: CourierMsg.REMOVE,
                        value: null,
                        sender: ctx.self
                    });
                } else {
                    console.log(`Курьер с id = ${msg.value} не найден`);
                }
                break;
            }
            case CompanyMsg.REMOVE_ORDER: {
                // Убрать заказ из списка доступных

                const order = state.orders.filter(o => o.active).find(o => o.id === msg.value);
                if (order != null) {
                    dispatch(order.ref, { name: OrderMsg.REMOVE, value: null, sender: ctx.self });
                } else {
                    console.log(`Заказ с id = ${msg.value} не найден`);
                }
                break;
            }
            case CompanyMsg.APPLY_REMOVE_COURIER: {
                // Применить сброс курьера

                const st = deep_copy(state);
                const courier = st.couriers.find(c => c.id === msg.value);
                if (courier != null) {
                    courier.active = false;
                    console.log(`Курьер с id = ${msg.value} убран`);
                }
                return st;
            }
            case CompanyMsg.APPLY_REMOVE_ORDER: {
                // Применить сброс заказа

                const st = deep_copy(state);
                const order = st.orders.find(o => o.id === msg.value);
                if (order != null) {
                    order.active = false;
                    console.log(`Заказ с id = ${msg.value} убран`);
                }
                return st;
            }
            case CompanyMsg.DELETE_COURIER: {
                // Полностью удалить курьера

                const st = deep_copy(state);
                const courier = st.couriers.filter(c => !c.active).find(c => c.id === msg.value);
                if (courier != null) {
                    st.couriers = st.couriers.filter(c => c.id !== courier.id);
                    stop(courier.ref);
                    console.log(`Курьер с id = ${msg.value} удален`);
                    return st;
                }
                console.log(`Курьер с id = ${msg.value} среди убранных курьеров не найден`);
                break;
            }
            case CompanyMsg.DELETE_ORDER: {
                // Полностью удалить заказ

                const st = deep_copy(state);
                const order = st.orders.filter(o => !o.active).find(o => o.id === msg.value);
                if (order != null) {
                    st.orders = st.orders.filter(o => o.id !== order.id);
                    stop(order.ref);
                    console.log(`Заказ с id = ${msg.value} удален`);
                    return st;
                }
                console.log(`Заказ с id = ${msg.value} среди убранных заказов не найден`);
                break;
            }
            case CompanyMsg.LOG: {
                // Вывод информации о курьерах и заказах в консоль

                console.log(
                    '\n=================================================== Сформированный план ===================================================\n'
                );
                state.couriers.forEach(c =>
                    dispatch(c.ref, { name: CourierMsg.LOG, value: c.active, sender: ctx.self })
                );
                state.orders.forEach(o =>
                    dispatch(o.ref, { name: OrderMsg.LOG, value: o.active, sender: ctx.self })
                );
                break;
            }
        }
        return state;
    }

    return spawn(parent, receiver, id);
}

module.exports = spawn_company;
