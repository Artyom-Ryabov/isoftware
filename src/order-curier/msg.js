const { Ref } = require('nact');

/**
 * @template T
 * @typedef {Object} Msg
 * @prop {string} name
 * @prop {T} value
 * @prop {Ref<any>=} sender
 */

/** @enum {string} */
const companyMsg = {
    INIT: 'INIT',
    CREATE_COURIER: 'CREATE_COURIER',
    CREATE_ORDER: 'CREATE_ORDER',
    CREATE_PLAN: 'CREATE_PLAN',
    RECEIVE_PLAN: 'RECEIVE_PLAN',
    NOTPLANNED_ORDER: 'NOTPLANNED_ORDER',
    LOG: 'LOG'
};

/** @enum {string} */
const courierMsg = {
    CAN_PLAN: 'CAN_PLAN',
    ACCEPT_PLAN: 'ACCEPT_PLAN',
    LOG: 'LOG'
};

/** @enum {string} */
const orderMsg = {
    RECEIVE_COURIERS: 'RECEIVE_COURIERS',
    RECEIVE_COURIER_PLAN: 'RECEIVE_COURIER_PLAN',
    FIND_COURIERS: 'FIND_COURIERS',
    PLAN_ORDER: 'PLAN_ORDER',
    LOG: 'LOG'
};

module.exports = {
    companyMsg,
    courierMsg,
    orderMsg
};
