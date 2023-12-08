// @ts-check
const { spawn, dispatch, Ref } = require('nact');
const { CompanyMsg, CourierMsg, OrderMsg } = require('./msg');
const spawn_order = require('./order');
const spawn_courier = require('./courier');
const deep_copy = require('./utlis');

/**
 * @template T
 * @typedef {import('./msg').Msg<T>} Msg
 */

/**
 * @typedef {Object} CompanyState
 * @prop {Ref<Msg<any>>[]} couriers
 * @prop {Ref<Msg<any>>[]} orders
 */

/** @type {CompanyState} */
const INIT_STATE = { orders: [], couriers: [] };

/**
 * @param {Ref<Msg<any>>} parent
 * @param {number} id
 * @param {CompanyState} init
 * @returns {Ref<Msg<any>>}
 */
function spawn_company(parent, id, init = INIT_STATE) {
    /**
     * @param {CompanyState} state
     * @param {Msg<any>} msg
     * @param {import('nact').ActorContext<Msg<any>, Ref<Msg<any>>>} ctx
     * @returns {CompanyState}
     */
    function receiver(state = init, msg, ctx) {
        switch (msg.name) {
            case CompanyMsg.CREATE_COURIER: {
                const _state = deep_copy(state);
                _state.couriers.push(spawn_courier(ctx.self, msg.value.id, msg.value.init_state));
                dispatch(ctx.self, { name: CompanyMsg.CREATE_PLAN, value: null });
                return _state;
            }
            case CompanyMsg.CREATE_ORDER: {
                const _state = deep_copy(state);
                const order = spawn_order(ctx.self, msg.value.id, msg.value.init_state);
                _state.orders.push(order);
                dispatch(order, { name: OrderMsg.FIND_COURIERS, value: state.couriers });
                return _state;
            }
            case CompanyMsg.CREATE_PLAN: {
                state.orders.forEach(o =>
                    dispatch(o, { name: OrderMsg.FIND_COURIERS, value: state.couriers })
                );
                break;
            }
            case CompanyMsg.RECEIVE_PLAN: {
                console.log(
                    `Заказ (${msg.value.order.name}) запланирован: ${
                        msg.value.name
                    } с прибылью: ${msg.value.price.toFixed(2)}`
                );
                break;
            }
            case CompanyMsg.ADJUST_SCHEDULE: {
                if (msg.sender == null) {
                    console.error('Не предоставлен заказ для распределения расписания');
                    break;
                }
                dispatch(msg.sender, {
                    name: OrderMsg.FIND_COURIERS_TO_REPLACE,
                    value: state.couriers
                });
                break;
            }
            case CompanyMsg.NOT_PLANNED_ORDER: {
                console.log(`Заказ (${msg.value.id}) не запланирован`);
                break;
            }
            case CompanyMsg.LOG: {
                console.log(
                    '\n=================================================== Сформированный план ===================================================\n'
                );
                state.couriers.forEach(c => dispatch(c, { name: CourierMsg.LOG, value: null }));
                state.orders.forEach(o => dispatch(o, { name: CourierMsg.LOG, value: null }));
                break;
            }
        }
        return state;
    }

    return spawn(parent, receiver, `Delivery-Company-${id}`);
}

module.exports = spawn_company;
