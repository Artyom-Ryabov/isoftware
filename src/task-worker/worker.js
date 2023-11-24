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
         * @param {import('nact').ActorContext<WorkerMsg, Ref<any>} ctx 
         * @returns {WorkerState}
         */
        (state = {}, msg, ctx) => {
            if (msg.name === workerMsg.INIT) {
                console.log('init:', ctx.name, ', with values:', msg.value);
                dispatch(msg.sender, {name: 'CREATE_TASK', value: ctx.self})
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
