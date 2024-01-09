// @ts-check

const { get_distance } = require('./location');

/**
 * @template T
 * @param {T} value
 * @returns {T}
 */
function deep_copy(value) {
    return JSON.parse(JSON.stringify(value));
}

/**
 * @template T
 * @param {T[]} items
 * @returns {T[][]}
 */
function find_combinations(items) {
    /** @type {T[][]} */
    const results = [];

    /**
     * @param {T[][]} results
     * @param {number} end
     * @param {number} level
     * @param {T[]} slate
     * @param {number[]} memo
     */
    function calc_combinations(results, end, level = 0, slate = [], memo = []) {
        for (let i = 0; i <= end; i++) {
            if (memo[i] === 1) {
                continue;
            }
            memo[i] = 1;
            slate.push(items[i]);
            if (level != end) {
                calc_combinations(results, end, level + 1, slate, memo);
            }
            if (slate.length === items.length) {
                results.push([...slate]);
            }
            slate.pop();
            memo[i] = 0;
        }
    }

    calc_combinations(results, items.length - 1);
    return results;
}

/**
 * @param {import('./location').Location} last_location
 * @param {import('../actors/msg').Order} order
 * @param {number} cost
 */
function calc_price(last_location, order, cost) {
    const distance = get_distance(last_location, order.from) + get_distance(order.from, order.to);
    return order.price - distance * cost;
}

/**
 * @param {import('./location').Location} last_location
 * @param {import('../actors/msg').Plan[]} schedule
 * @param {number} cost
 * @returns {number}
 */
function calc_total(last_location, schedule, cost) {
    let total = calc_price(last_location, schedule[0].order, cost);
    schedule.reduce((acc, plan) => {
        total += calc_price(acc.order.to, plan.order, cost);
        return plan;
    });
    return total;
}

/**
 * @param {number} sec
 */
async function wait(sec) {
    return new Promise(r => setTimeout(() => r(null), sec));
}

module.exports = {
    deep_copy,
    find_combinations,
    calc_price,
    calc_total,
    wait
};
