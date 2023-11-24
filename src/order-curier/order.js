const { spawn, dispatch, Ref } = require('nact');
const { getDistance } = require('./location');
const { companyMsg, courierMsg, orderMsg } = require('./msg');

/**
 * @typedef {Object} OrderState
 * @prop {import('./location').Location} from
 * @prop {import('./location').Location} to
 * @prop {number} weight
 * @prop {number} price
 * @prop {any} plan
 * @prop {Ref<any>[]} couriers
 * @prop {any[]} couriersPlans
 */

const spawnOrder = (parent, id, initialState = {}) =>
    spawn(
        parent,
        /**
         * @param {OrderState} [state={}]
         * @param {import('./msg').Msg<any>} msg
         * @param {import('nact').ActorContext<import('./msg').Msg<any>, Ref<any>} ctx
         * @returns {OrderState}
         */
        (state = initialState, msg, ctx) => {
            switch (msg.name) {
                case orderMsg.RECEIVE_COURIERS:
                    return { ...state, couriers: [...msg.value] };
                case orderMsg.RECEIVE_COURIER_PLAN:
                    const couriersPlans = [...state.couriersPlans];
                    couriersPlans.push({ ...msg.value, sender: msg.sender });
                    if (couriersPlans.length === state.couriers.length) {
                        dispatch(ctx.self, { name: orderMsg.PLAN_ORDER });
                    }
                    return { ...state, couriersPlans };
                case orderMsg.FIND_COURIERS:
                    state.couriers.forEach(c =>
                        dispatch(c, {
                            name: courierMsg.CAN_PLAN,
                            value: {
                                id: ctx.name,
                                weight: state.weight,
                                price: state.price,
                                from: state.from,
                                to: state.to
                            },
                            sender: ctx.self
                        })
                    );
                    break;
                case orderMsg.PLAN_ORDER:
                    const plan = state.couriersPlans.sort((a, b) => a.price - b.price).at(-1);
                    if (plan != null && plan.price > 0) {
                        dispatch(plan.sender, {
                            name: courierMsg.ACCEPT_PLAN,
                            value: { id: ctx.name, price: plan.price },
                            sender: ctx.self
                        });
                        return { ...state, bestPlan: plan };
                    }
                    dispatch(parent, {
                        name: companyMsg.NOTPLANNED_ORDER,
                        value: { id: ctx.name },
                        sender: ctx.self
                    });
                    break;
                case orderMsg.LOG:
                    console.log(
                        `Заказ ${state.from.getString()} -> (${getDistance(
                            state.from,
                            state.to
                        )} км / ${state.weight} кг) | Цена: ${state.price}`
                    );
                    break;
            }
            return state;
        },
        `order-${id}`
    );

module.exports = spawnOrder;
