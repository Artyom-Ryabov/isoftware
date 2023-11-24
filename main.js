const { dispatch, stop } = require('nact');
const system = require('./src/system');
const { companyMsg } = require('./src/order-curier/msg');
const { setLocation, getDistance } = require('./src/order-curier/location');
const spawnCompany = require('./src/order-curier/company');

const getInt = (min, max) => Math.floor(Math.random() * max + min);
const lenCost = 150;
const company = spawnCompany(system, 0, { couriers: [], orders: [] });
const names = ['Андрей', 'Виталий', 'Сергей', 'Елена'];
for (let i = 0; i < names.length; i++) {
    dispatch(company, {
        name: companyMsg.CREATE_COURIER,
        value: {
            id: i,
            initState: {
                name: names[i],
                location: setLocation(getInt(1, 20), getInt(1, 20)),
                capacity: getInt(2, 4),
                speed: getInt(2, 4),
                price: lenCost * 0.25,
                schedule: []
            }
        }
    });
}
for (let i = 0; i < 20; i++) {
    const from = setLocation(getInt(1, 20), getInt(1, 20));
    const to = setLocation(getInt(1, 20), getInt(1, 20));
    dispatch(company, {
        name: companyMsg.CREATE_ORDER,
        value: {
            id: i,
            initState: {
                from,
                to,
                weight: getInt(1, 4),
                price: getDistance(from, to) * lenCost,
                plan: null,
                couriers: [],
                couriersPlans: []
            }
        }
    });
}

dispatch(company, { name: companyMsg.CREATE_PLAN });

setTimeout(() => stop(system), 5000);
