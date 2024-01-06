// @ts-check
const { Ref } = require('nact');

/**
 * @typedef {import('./location').Location} Location
 */

/**
 * @typedef {Object} Msg
 * @prop {string} name
 * @prop {any} value
 * @prop {Ref<Msg>} sender
 */

/**
 * @typedef {Object} Order
 * @prop {string} id
 * @prop {number} weight
 * @prop {number} price
 * @prop {Location} from
 * @prop {Location} to
 */

/**
 * @typedef {Object} CourierPlan
 * @prop {Ref<Msg>} order_ref
 * @prop {Order} order
 * @prop {number} income
 */

/**
 * @typedef {Object} Courier
 * @prop {string} name
 * @prop {CourierPlan[]} schedule
 * @prop {number} total
 */

/**
 * @typedef {Object} TotalPlan
 * @prop {CourierPlan[]} schedule
 * @prop {number} total
 */

/**
 * @typedef {Object} OrderPlan
 * @prop {Ref<Msg>} courier_ref
 * @prop {Courier} courier
 */

/** @enum {string} */
const CompanyMsg = {
    INIT: 'INIT',
    CREATE_COURIER: 'CREATE_COURIER',
    CREATE_ORDER: 'CREATE_ORDER',
    CREATE_PLAN: 'CREATE_PLAN',
    RECEIVE_PLAN: 'RECEIVE_PLAN',
    NOT_PLANNED_ORDER: 'NOT_PLANNED_ORDER',
    ADJUST_SCHEDULE: 'ADJUST_SCHEDULE',
    LOG: 'LOG'
};

/** @enum {string} */
const CourierMsg = {
    CAN_PLAN: 'CAN_PLAN',
    CAN_REPLACE: 'CAN_REPLACE',
    ACCEPT_PLAN: 'ACCEPT_PLAN',
    ACCEPT_REPLACE_PLAN: 'ACCEPT_REPLACE_PLAN',
    LOG: 'LOG'
};

/**
 * @typedef {Object} MsgOrder
 * @prop {'CAN_PLAN'|'CAN_REPLACE'} name
 * @prop {Order} value
 * @prop {Ref<Msg>} sender
 */

/**
 * @typedef {Object} MsgCourierPlan
 * @prop {'RECEIVE_COURIER_PLAN'|'RECEIVE_COURIER_REPLACE_PLAN'} name
 * @prop {CourierPlan} value
 * @prop {Ref<Msg>} sender
 */

/**
 * @typedef {Object} MsgPlan
 * @prop {'ACCEPT_PLAN'|'ACCEPT_REPLACE_PLAN'} name
 * @prop {CourierPlan[]} value
 * @prop {Ref<Msg>} sender
 */

/**
 * @typedef {Object} MsgEmpty
 * @prop {'PLAN_ORDER'|'PLAN_REPLACING_ORDER'|'DISCARD'|'LOG'} name
 * @prop {null} value
 * @prop {Ref<Msg>} sender
 */

/** @enum {string} */
const OrderMsg = {
    RECEIVE_COURIER_PLAN: 'RECEIVE_COURIER_PLAN',
    RECEIVE_COURIER_REPLACE_PLAN: 'RECEIVE_COURIER_REPLACE_PLAN',
    FIND_COURIERS: 'FIND_COURIERS',
    FIND_COURIERS_TO_REPLACE: 'FIND_COURIERS_TO_REPLACE',
    PLAN_ORDER: 'PLAN_ORDER',
    PLAN_REPLACING_ORDER: 'PLAN_REPLACING_ORDER',
    DISCARD: 'DISCARD',
    UPDATE_PLAN: 'UPDATE_PLAN',
    LOG: 'LOG'
};

module.exports = {
    CompanyMsg,
    CourierMsg,
    OrderMsg
};
