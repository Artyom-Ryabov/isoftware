const { spawn, dispatch, Ref } = require('nact');
const { getDistance } = require('./location');
const { companyMsg, courierMsg, orderMsg } = require('./msg');

/**
 * @typedef {Object} CourierState
 * @prop {string} name
 * @prop {import('./location').Location} location
 * @prop {number} capacity
 * @prop {number} speed
 * @prop {number} price
 * @prop {any[]} schedule
 */

const spawnCourier = (parent, id, initialState = {}) =>
    spawn(
        parent,
        /**
         * @param {CourierState} [state={}]
         * @param {import('./msg').Msg<any>} msg
         * @param {import('nact').ActorContext<import('./msg').Msg<any>, Ref<any>} ctx
         * @returns {CourierState}
         */
        (state = initialState, msg, ctx) => {
            switch (msg.name) {
                case courierMsg.CAN_PLAN:
                    if (msg.value.weight > state.capacity) {
                        console.log(`Курьер (${state.name}) не смог взять заказ (${msg.value.id}) весом: ${msg.value.weight} кг (${state.capacity} кг)`);
                        break;
                    }
                    const lastLocation = state.schedule.at(-1)?.to ?? state.location;
                    const distance =
                        getDistance(lastLocation, msg.value.from) +
                        getDistance(msg.value.from, msg.value.to);
                    const price = msg.value.price - distance * state.price;
                    const plan = {
                        name: state.name,
                        price
                    };
                    dispatch(msg.sender, {
                        name: orderMsg.RECEIVE_COURIER_PLAN,
                        value: plan,
                        sender: ctx.self
                    });
                    break;
                case courierMsg.ACCEPT_PLAN:
                    dispatch(parent, {
                        name: companyMsg.RECEIVE_PLAN,
                        value: { ...msg.value, name: state.name }
                    });
                    return { ...state, schedule: [...state.schedule, msg.value] };
                case courierMsg.LOG:
                    console.log(
                        `Курьер: ${state.name}|Скорость: ${state.speed}|Грузоподъемность: ${
                            state.capacity
                        }|Находится в ${state.location.getString()}`
                    );
                    break;
            }
            return state;
        },
        `courier-${id}`
    );

module.exports = spawnCourier;
