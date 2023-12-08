// @ts-check
const { Ref } = require('nact');

/**
 * @template T
 * @typedef {Object} Msg
 * @prop {string} name
 * @prop {T} value
 * @prop {Ref<any>=} sender
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
