const { spawn, dispatch, Ref } = require('nact');
const { companyMsg, courierMsg, orderMsg } = require('./msg');
const spawnOrder = require('./order');
const spawnCourier = require('./courier');

/**
 * @typedef {Object} CompanyState
 * @prop {Ref<any>[]} couriers
 * @prop {Ref<any>[]} orders
 */

const spawnCompany = (parent, id, initialState = {}) =>
    spawn(
        parent,
        /**
         * @param {CompanyState} [state={}]
         * @param {import('./msg').Msg<any>} msg
         * @param {import('nact').ActorContext<import('./msg').Msg<any>, Ref<any>} ctx
         * @returns {CompanyState}
         */
        (state = initialState, msg, ctx) => {
            switch (msg.name) {
                case companyMsg.INIT:
                    return { ...state, orders: [], couriers: [...msg.value] };
                case companyMsg.CREATE_COURIER:
                    const couriers = [...state.couriers];
                    couriers.push(spawnCourier(ctx.self, msg.value.id, msg.value.initState));
                    return { ...state, couriers };
                case companyMsg.CREATE_ORDER:
                    const orders = [...state.orders];
                    const order = spawnOrder(ctx.self, msg.value.id, msg.value.initState);
                    orders.push(order);
                    dispatch(order, { name: orderMsg.RECEIVE_COURIERS, value: state.couriers });
                    return { ...state, orders };
                case companyMsg.CREATE_PLAN:
                    state.orders.forEach(o => dispatch(o, { name: orderMsg.FIND_COURIERS }));
                    break;
                case companyMsg.RECEIVE_PLAN:
                    console.log(
                        `Заказ (${msg.value.id}) запланирован: ${msg.value.name} с прибылью: ${msg.value.price.toFixed(2)}`
                    );
                    break;
                case companyMsg.NOTPLANNED_ORDER:
                    console.log(`Заказ (${msg.value.id}) не запланирован`);
                    break;
                case companyMsg.LOG:
                    state.couriers.forEach(c => dispatch(c, { name: courierMsg.LOG }));
                    state.orders.forEach(o => dispatch(o, { name: courierMsg.LOG }));
                    break;
            }
            return state;
        },
        `Delivery-Company-${id}`
    );

module.exports = spawnCompany;
