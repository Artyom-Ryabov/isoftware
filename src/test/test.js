// @ts-check

function test_system() {
    const { dispatch, stop } = require('nact');
    const { COURIERS, ORDERS, COURIER_COST, create_order } = require('./samples');
    const { CompanyMsg } = require('../actors/msg');
    const spawn_company = require('../actors/company');
    const system = require('../system');
    const { set_location } = require('../lib/location');

    const company = spawn_company(system, 'Delivery-company');
    COURIERS.forEach((c, i) =>
        dispatch(company, {
            name: CompanyMsg.CREATE_COURIER,
            value: { id: `Courier-${i}`, init_state: c },
            sender: company
        })
    );
    ORDERS.forEach((o, i) =>
        dispatch(company, {
            name: CompanyMsg.CREATE_ORDER,
            value: { id: `Order-${i}`, init_state: o },
            sender: company
        })
    );

    setTimeout(
        () => dispatch(company, { name: CompanyMsg.LOG, value: null, sender: company }),
        3000
    );

    setTimeout(
        () =>
            dispatch(company, {
                name: CompanyMsg.CREATE_COURIER,
                value: {
                    id: `Courier-${COURIERS.length}`,
                    init_state: {
                        name: 'Иван',
                        location: set_location(9, 9),
                        lift: 5,
                        cost: COURIER_COST,
                        total: 0,
                        schedule: [],
                        discard_ref: null
                    }
                },
                sender: company
            }),
        9000
    );

    setTimeout(
        () =>
            dispatch(company, {
                name: CompanyMsg.REMOVE_COURIER,
                value: 'Courier-1',
                sender: company
            }),
        3000
    );

    setTimeout(
        () => dispatch(company, { name: CompanyMsg.LOG, value: null, sender: company }),
        6000
    );

    setTimeout(
        () =>
            dispatch(company, {
                name: CompanyMsg.REMOVE_ORDER,
                value: 'Order-0',
                sender: company
            }),
        9000
    );

    setTimeout(() => {
        dispatch(company, {
            name: CompanyMsg.CREATE_ORDER,
            value: {
                id: `Order-${ORDERS.length}`,
                init_state: create_order(set_location(1, 2), set_location(1, 3), 1, 151)
            },
            sender: company
        });
        dispatch(company, {
            name: CompanyMsg.CREATE_ORDER,
            value: {
                id: `Order-${ORDERS.length + 1}`,
                init_state: create_order(set_location(9, 9), set_location(10, 10), 1, 151)
            },
            sender: company
        });
    }, 6000);

    setTimeout(
        () => dispatch(company, { name: CompanyMsg.LOG, value: null, sender: company }),
        9000
    );

    setTimeout(
        () => dispatch(company, { name: CompanyMsg.LOG, value: null, sender: company }),
        12000
    );

    setTimeout(() => stop(system), 15000);
}

module.exports = {
    test_system
};
