// @ts-check
const { dispatch, stop } = require('nact');
const system = require('./src/system');
const { COURIERS, ORDERS, COURIER_COST, create_order } = require('./src/samples');
const { CompanyMsg } = require('./src/msg');
const spawn_company = require('./src/company');
const { set_location } = require('./src/location');

const company = spawn_company(system, 0);
COURIERS.forEach((c, i) =>
    dispatch(company, { name: CompanyMsg.CREATE_COURIER, value: { id: i, init_state: c } })
);
ORDERS.forEach((o, i) =>
    dispatch(company, { name: CompanyMsg.CREATE_ORDER, value: { id: i, init_state: o } })
);

setTimeout(() => dispatch(company, { name: CompanyMsg.LOG, value: null }), 100);

setTimeout(
    () =>
        dispatch(company, {
            name: CompanyMsg.CREATE_COURIER,
            value: {
                id: COURIERS.length,
                init_state: {
                    name: 'Иван',
                    location: set_location(9, 9),
                    capacity: 5,
                    speed: 2,
                    cost: COURIER_COST,
                    schedule: []
                }
            }
        }),
    150
);

setTimeout(() => dispatch(company, { name: CompanyMsg.LOG, value: null }), 500);

setTimeout(
    () => (
        dispatch(company, {
            name: CompanyMsg.CREATE_ORDER,
            value: {
                id: ORDERS.length,
                init_state: create_order(set_location(1, 2), set_location(2, 2), 2, 151)
            }
        }),
        dispatch(company, {
            name: CompanyMsg.CREATE_ORDER,
            value: {
                id: ORDERS.length + 1,
                init_state: create_order(set_location(9, 9), set_location(10, 10), 4, 151)
            }
        })
    ),
    1000
);

setTimeout(() => dispatch(company, { name: CompanyMsg.LOG, value: null }), 2000);

setTimeout(() => stop(system), 5000);
