// @ts-check
/**
 * @typedef {Object} Location
 * @prop {number} x
 * @prop {number} y
 * @prop {string} coords
 */

/**
 * @param {number} x
 * @param {number} y
 * @returns {Location}
 */
const set_location = (x, y) => ({
    x,
    y,
    coords: `${x},${y}`
});

/**
 * @param {Location} from
 * @param {Location} to
 */
const get_distance = (from, to) =>
    Math.pow(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2), 0.5);

module.exports = {
    set_location,
    get_distance
};
