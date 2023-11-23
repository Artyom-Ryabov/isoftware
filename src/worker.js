const { spawn, dispatch } = require('nact');

/**
 * @typedef {Object} WorkerState
 * @prop {number} capacity
 */

/**
 * @typedef {Object} WorkerMsg
 * @prop {string} name
 * @prop {number} value
 */

/** @enum {string} */
const workerMsg = {
    INIT: 'INIT',
    CREATE_TASK: 'CREATE_TASK',
    DISTRIBUTE_TASK: 'DISTRIBUTE_TASK'
};

const spawnWorker = (parent, id) =>
    spawn(
        parent,
        /**
         * @param {WorkerState} [state={}]
         * @param {WorkerMsg} msg
         * @returns {WorkerState}
         */
        (state = {}, msg, ctx) => {
            if (msg.name === workerMsg.INIT) {
                console.log('init:', ctx.name, ', with values:', msg.value);
                dispatch(parent, {name: 'CREATE_TASK', value: ctx.self})
                return { ...state, capacity: msg.value };
            }
            return state;
        },
        `worker-${id}`
    );

module.exports = {
    spawnWorker,
    workerMsg
};
