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
 * @typedef {Object} Plan
 * @prop {Ref<Msg>} order_ref
 * @prop {Order} order
 * @prop {number} income
 */

/**
 * @typedef {Object} Schedule
 * @prop {string} order_id
 * @prop {Plan[]} plans
 * @prop {number} total
 */

/**
 * @typedef {Object} CourierSchedule
 * @prop {Ref<Msg>} courier_ref
 * @prop {Schedule} schedule
 */

/**
 * @typedef {Object} Courier
 * @prop {Ref<Msg>} ref
 * @prop {string} name
 */

/**
 * @typedef {Object} OrderPlan
 * @prop {Courier} courier
 * @prop {Plan} plan
 */

/** @enum {string} */
const CompanyMsg = {
    CREATE_COURIER: 'CREATE_COURIER',
    CREATE_ORDER: 'CREATE_ORDER',
    NOTIFY_ORDERS: 'NOTIFY_ORDERS',
    CREATE_PLAN: 'CREATE_PLAN',
    RECEIVE_PLAN: 'RECEIVE_PLAN',
    NOT_PLANNED_ORDER: 'NOT_PLANNED_ORDER',
    ADJUST_SCHEDULE: 'ADJUST_SCHEDULE',
    ACTIVATE_COURIER: 'ACTIVATE_COURIER',
    ACTIVATE_ORDER: 'ACTIVATE_ORDER',
    DISCARD_COURIER: 'DISCARD_COURIER',
    DISCARD_ORDER: 'DISCARD_ORDER',
    APPLY_DISCARD_COURIER: 'APPLY_DISCARD_COURIER',
    APPLY_DISCARD_ORDER: 'APPLY_DISCARD_ORDER',
    DESTROY_COURIER: 'DESTROY_COURIER',
    DESTROY_ORDER: 'DESTROY_ORDER',
    LOG: 'LOG'
};

/** @enum {string} */
const CourierMsg = {
    CAN_PLAN: 'CAN_PLAN',
    CAN_REPLACE: 'CAN_REPLACE',
    ACCEPT_PLAN: 'ACCEPT_PLAN',
    ACCEPT_REPLACE_PLAN: 'ACCEPT_REPLACE_PLAN',
    REMOVE_ORDER: 'REMOVE_ORDER',
    DISCARD: 'DISCARD',
    LOG: 'LOG'
};

/** @enum {string} */
const OrderMsg = {
    NOTIFY: 'NOTIFY',
    FIND_COURIERS: 'FIND_COURIERS',
    FIND_COURIERS_TO_REPLACE: 'FIND_COURIERS_TO_REPLACE',
    RECEIVE_COURIER_PLAN: 'RECEIVE_COURIER_PLAN',
    RECEIVE_COURIER_REPLACE_PLAN: 'RECEIVE_COURIER_REPLACE_PLAN',
    PLAN_ORDER: 'PLAN_ORDER',
    PLAN_REPLACING_ORDER: 'PLAN_REPLACING_ORDER',
    ACCEPT_PLAN: 'ACCEPT_PLAN',
    REMOVE: 'REMOVE',
    DISCARD: 'DISCARD',
    LOG: 'LOG'
};

module.exports = {
    CompanyMsg,
    CourierMsg,
    OrderMsg
};
