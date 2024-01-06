// @ts-check
const { spawn, dispatch, Ref } = require('nact');
const { CompanyMsg, CourierMsg, OrderMsg } = require('./msg');
const spawn_order = require('./order');
const spawn_courier = require('./courier');
const { deep_copy } = require('./utlis');

/**
 * @typedef {import('./msg').Msg} Msg
 * @typedef {import('./msg').Courier} Courier
 */

/**
 * @typedef {import('nact').ActorContext<Msg, Ref<Msg>>} ActorContext
 */

/**
 * @typedef {Object} CompanyState
 * @prop {Ref<Msg>[]} couriers
 * @prop {Ref<Msg>[]} orders
 */

/** @type {CompanyState} */
const INIT_STATE = { orders: [], couriers: [] };

/**
 * @param {Ref<Msg>} parent
 * @param {number} id
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
                const st = deep_copy(state);
                st.couriers.push(spawn_courier(ctx.self, msg.value.id, msg.value.init_state));
                dispatch(ctx.self, { name: CompanyMsg.CREATE_PLAN, value: null, sender: ctx.self });
                return st;
            }
            case CompanyMsg.CREATE_ORDER: {
                const st = deep_copy(state);
                const order = spawn_order(ctx.self, msg.value.id, msg.value.init_state);
                st.orders.push(order);
                dispatch(order, {
                    name: OrderMsg.FIND_COURIERS,
                    value: state.couriers,
                    sender: ctx.self
                });
                return st;
            }
            case CompanyMsg.CREATE_PLAN: {
                state.orders.forEach(o =>
                    dispatch(o, {
                        name: OrderMsg.FIND_COURIERS,
                        value: state.couriers,
                        sender: ctx.self
                    })
                );
                break;
            }
            case CompanyMsg.RECEIVE_PLAN: {
                const msg_value = /** @type {Courier} */ (msg.value);
                console.log(
                    `Заказ на курьера ${msg_value.name} запланирован с прибылью: ${msg_value.total.toFixed(2)}`
                );
                break;
            }
            case CompanyMsg.ADJUST_SCHEDULE: {
                dispatch(msg.sender, {
                    name: OrderMsg.FIND_COURIERS_TO_REPLACE,
                    value: state.couriers,
                    sender: ctx.self
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
                state.couriers.forEach(c =>
                    dispatch(c, { name: CourierMsg.LOG, value: null, sender: ctx.self })
                );
                state.orders.forEach(o =>
                    dispatch(o, { name: CourierMsg.LOG, value: null, sender: ctx.self })
                );
                break;
            }
        }
        return state;
    }

    return spawn(parent, receiver, `Delivery-Company-${id}`);
}

module.exports = spawn_company;
