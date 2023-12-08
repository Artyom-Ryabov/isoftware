// @ts-check
const { spawn, dispatch, Ref } = require('nact');
const { get_distance, set_location } = require('./location');
const { CompanyMsg, CourierMsg, OrderMsg } = require('./msg');
const deep_copy = require('./utlis');

/**
 * @template T
 * @typedef {import('./msg').Msg<T>} Msg
 */

/**
 * @typedef {Object} Plan
 * @prop {Ref<Msg<any>>} order
 * @prop {string} order_id
 * @prop {number} price
 * @prop {number} total
 * @prop {import('./location').Location} from
 * @prop {import('./location').Location} to
 * @prop {number} slot
 */

/**
 * @typedef {Object} CourierState
 * @prop {string} name
 * @prop {import('./location').Location} location
 * @prop {number} capacity
 * @prop {number} speed
 * @prop {number} cost
 * @prop {Plan[]} schedule
 */

/** @type {CourierState} */
const INIT_STATE = {
    name: '',
    location: set_location(0, 0),
    capacity: 0,
    speed: 0,
    cost: 0,
    schedule: []
};

/**
 * @param {import('./location').Location} last_location
 * @param {*} plan
 * @param {number} cost
 */
function calc_price(last_location, plan, cost) {
    const distance = get_distance(last_location, plan.from) + get_distance(plan.from, plan.to);
    return plan.price - distance * cost;
}

/**
 * @param {Ref<Msg<any>>} parent
 * @param {number} id
 * @param {CourierState} init
 * @returns {Ref<any>}
 */
function spawn_courier(parent, id, init = INIT_STATE) {
    /**
     * @param {CourierState} state
     * @param {Msg<any>} msg
     * @param {import('nact').ActorContext<Msg<any>, Ref<any>>} ctx
     * @returns {CourierState}
     */
    function receiver(state = init, msg, ctx) {
        switch (msg.name) {
            case CourierMsg.CAN_PLAN: {
                if (msg.sender == null) {
                    console.error("Нужно предоставить адрес отправителя сообщения 'Курьер'");
                    break;
                }
                const _state = deep_copy(state);
                if (msg.value.weight > _state.capacity) {
                    dispatch(msg.sender, { name: OrderMsg.RECEIVE_COURIER_PLAN, value: null });
                    break;
                }

                const last_location = _state.schedule.at(-1)?.to ?? _state.location;
                const plan = {
                    courier: ctx.self,
                    courier_name: _state.name,
                    total: calc_price(last_location, msg.value, _state.cost),
                    slot: _state.schedule.length
                };
                dispatch(msg.sender, {
                    name: OrderMsg.RECEIVE_COURIER_PLAN,
                    value: plan
                });
                break;
            }
            case CourierMsg.CAN_REPLACE: {
                const _state = deep_copy(state);
                if (msg.sender == null || _state.schedule.length === 0) {
                    console.log(`Курьер (${_state.name}) не может перераспределить заказы`);
                    break;
                }
                if (msg.value.weight > _state.capacity) {
                    dispatch(msg.sender, { name: OrderMsg.RECEIVE_COURIER_PLAN, value: null });
                    break;
                }
                const schedule = deep_copy(_state.schedule);
                schedule.sort((a, b) => a.total - b.total);
                const income = _state.schedule.reduce((acc, plan) => acc + plan.total, 0);
                const replacing_order_id = schedule[0].order_id;
                const replacing_index = _state.schedule.findIndex(
                    p => p.order_id === replacing_order_id
                );
                const last_location =
                    replacing_index === 0
                        ? _state.location
                        : _state.schedule[replacing_index - 1].to;
                const total = calc_price(last_location, msg.value, _state.cost);
                _state.schedule[replacing_index] = {
                    order: msg.sender,
                    order_id: msg.value.id,
                    total,
                    from: msg.value.from,
                    to: msg.value.to,
                    slot: replacing_index,
                    price: msg.value.price
                };
                if (_state.schedule.length > 1 && replacing_index + 1 < _state.schedule.length) {
                    _state.schedule[replacing_index + 1].total = calc_price(
                        msg.value.to,
                        _state.schedule[replacing_index + 1],
                        _state.cost
                    );
                }
                const value =
                    income < _state.schedule.reduce((acc, plan) => acc + plan.total, 0)
                        ? {
                              courier: ctx.self,
                              courier_name: _state.name,
                              total,
                              slot: replacing_index,
                              schedule: _state.schedule
                          }
                        : null;
                dispatch(msg.sender, {
                    name: OrderMsg.RECEIVE_COURIER_REPLACE_PLAN,
                    value
                });
                break;
            }
            case CourierMsg.ACCEPT_PLAN: {
                const _state = deep_copy(state);
                if (_state.schedule.length !== msg.value.slot) {
                    dispatch(msg.value.order, {
                        name: OrderMsg.DISCARD,
                        value: null
                    });
                    break;
                }
                dispatch(parent, {
                    name: CompanyMsg.RECEIVE_PLAN,
                    value: { ...msg.value, name: _state.name }
                });
                _state.schedule.push(msg.value);
                return _state;
            }
            case CourierMsg.ACCEPT_REPLACE_PLAN: {
                const _state = deep_copy(state);
                dispatch(_state.schedule[0].order, { name: OrderMsg.DISCARD, value: null });
                _state.schedule = msg.value;
                return _state;
            }
            case CourierMsg.LOG: {
                console.log(
                    `Курьер: ${state.name} | Скорость: ${state.speed} | Грузоподъемность: ${
                        state.capacity
                    } | Находится в ${state.location.coords}${
                        state.schedule.length > 0 ? ': | Расписание' : ''
                    }`
                );
                state.schedule.forEach(p =>
                    console.log(`Заказ (${p.order_id}) -> Цена: ${p.total.toFixed(2)}`)
                );
                break;
            }
        }
        return state;
    }

    return spawn(parent, receiver, `courier-${id}`);
}

module.exports = spawn_courier;
