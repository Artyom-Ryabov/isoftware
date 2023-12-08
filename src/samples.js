// @ts-check
const { set_location, get_distance } = require('./location');

const LEN_COST = 150;
const COURIER_COST = LEN_COST * 0.25;

/** @type {import('./courier').CourierState[]} */
const COURIERS = [
    {
        name: 'Андрей',
        location: set_location(1, 2),
        capacity: 4,
        speed: 2,
        cost: COURIER_COST,
        schedule: []
    },
    {
        name: 'Виталий',
        location: set_location(20, 11),
        capacity: 3,
        speed: 5,
        cost: COURIER_COST,
        schedule: []
    }
];

function create_order(from, to, weight, len_cost = LEN_COST) {
    return {
        from,
        to,
        price: len_cost * get_distance(from, to),
        weight,
        plan: null,
        plans: [],
        num_couriers: 0
    };
}

/** @type {import('./order').OrderState[]} */
const ORDERS = [
    create_order(set_location(9, 9), set_location(10, 10), 4),
    create_order(set_location(1, 2), set_location(2, 2), 2),
    create_order(set_location(11, 2), set_location(20, 2), 3),
    create_order(set_location(1, 20), set_location(2, 2), 1),
    create_order(set_location(19, 2), set_location(2, 20), 5),
    create_order(set_location(9, 9), set_location(20, 20), 4),
    create_order(set_location(9, 9), set_location(19, 6), 3),
    create_order(set_location(5, 2), set_location(4, 2), 2),
    create_order(set_location(5, 5), set_location(10, 14), 1)
];

module.exports = {
    COURIERS,
    ORDERS,
    LEN_COST,
    COURIER_COST,
    create_order
};
