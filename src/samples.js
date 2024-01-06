// @ts-check
const { set_location, get_distance } = require('./location');

const LEN_COST = 150;
const COURIER_COST = LEN_COST * 0.25;
const COURIER_WORKLOAD = 5;

/** @type {import('./courier').CourierState[]} */
const COURIERS = [
    // {
    //     name: 'Андрей',
    //     location: set_location(1, 2),
    //     capacity: 4,
    //     cost: COURIER_COST,
    //     total: 0,
    //     schedule: [],
    //     prev_order_ref: null
    // },
    // {
    //     name: 'Виталий',
    //     location: set_location(20, 11),
    //     capacity: 3,
    //     cost: COURIER_COST,
    //     total: 0,
    //     schedule: [],
    //     prev_order_ref: null
    // }
    {
        name: 'Test 1',
        location: set_location(1, 1),
        lift: 1,
        workload: COURIER_WORKLOAD,
        cost: COURIER_COST,
        total: 0,
        schedule: [],
        prev_order_ref: null
    },
    {
        name: 'Test 2',
        location: set_location(19, 1),
        lift: 1,
        workload: COURIER_WORKLOAD,
        cost: COURIER_COST,
        total: 0,
        schedule: [],
        prev_order_ref: null
    }
];

/** @returns {import('./order').OrderState} */
function create_order(from, to, weight, len_cost = LEN_COST) {
    return {
        from,
        to,
        price: len_cost * get_distance(from, to),
        weight,
        order_plan: null,
        order_plans: [],
        num_couriers: 0,
        lock: false
    };
}

/** @type {import('./order').OrderState[]} */
const ORDERS = [
    create_order(set_location(1, 2), set_location(1, 3), 1),
    create_order(set_location(1, 3), set_location(1, 5), 1),
    create_order(set_location(1, 5), set_location(1, 9), 1),
    create_order(set_location(1, 9), set_location(1, 14), 1),
    create_order(set_location(1, 14), set_location(1, 19), 1),
    create_order(set_location(19, 2), set_location(19, 3), 1),
    create_order(set_location(19, 3), set_location(19, 5), 1),
    create_order(set_location(19, 5), set_location(19, 9), 1),
    create_order(set_location(19, 9), set_location(19, 14), 1),
    create_order(set_location(19, 14), set_location(19, 19), 1),
    // create_order(set_location(9, 9), set_location(10, 10), 4),
    // create_order(set_location(1, 2), set_location(2, 2), 2),
    // create_order(set_location(11, 2), set_location(20, 2), 3),
    // create_order(set_location(1, 20), set_location(2, 2), 1),
    // create_order(set_location(19, 2), set_location(2, 20), 5),
    // create_order(set_location(9, 9), set_location(20, 20), 4),
    // create_order(set_location(9, 9), set_location(19, 6), 3),
    // create_order(set_location(5, 2), set_location(4, 2), 2),
    // create_order(set_location(5, 5), set_location(10, 14), 1)
];

module.exports = {
    COURIERS,
    ORDERS,
    LEN_COST,
    COURIER_COST,
    create_order
};
