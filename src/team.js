const { dispatch, spawn, Ref } = require('nact');
const system = require('./system');
const { spawnWorker, workerMsg } = require('./worker');

/**
 * @typedef {Object} TeamState
 * @prop {Ref[]} workers
 * @prop {Ref[]} tasks
 */

/**
 * @typedef {Object} TeamMsg
 * @prop {teamMsg} name
 * @prop {any} value
 */

/** @enum {string} */
const teamMsg = {
    CREATE_WORKER: 'CREATE_WORKER',
    CREATE_TASK: 'CREATE_TASK',
    DISTRIBUTE_TASK: 'DISTRIBUTE_TASK'
};

const team = spawn(
    system,
    /**
     * @param {TeamState} [state={}]
     * @param {TeamMsg} msg
     * @returns {TeamState}
     */
    (state = {}, msg, ctx) => {
        if (msg.name === teamMsg.CREATE_WORKER) {
            const ws = [...(state.workers ?? [])];
            const w = spawnWorker(ctx.self, msg.value.id);
            dispatch(w, { name: workerMsg.INIT, value: msg.value.capacity, sender: ctx.self });
            ws.push(w);
            return {
                ...state,
                workers: ws
            };
        }
        if (msg.name === teamMsg.CREATE_TASK) {
            console.log('say hello to my little task -', msg.value.name)
        }
        return state;
    },
    'team'
);

module.exports = {
    team,
    teamMsg
};
