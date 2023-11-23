const { dispatch, stop } = require('nact');
const { team, teamMsg } = require('./src/team');
const system = require('./src/system');

for (let i = 0; i < 3; i++) {
    dispatch(team, {
        name: teamMsg.CREATE_WORKER,
        value: { id: i, capacity: Math.floor(Math.random() * 5 + 5) }
    });
}

setTimeout(() => stop(system), 5000);
