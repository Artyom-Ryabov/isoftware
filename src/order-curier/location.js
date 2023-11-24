/**
 * @typedef {Object} Location
 * @prop {number} x
 * @prop {number} y
 * @prop {() => string} getString
 */

/**
 * @param {number} x
 * @param {number} y
 * @returns {Location}
 */
const setLocation = (x, y) => ({
    x,
    y,
    getString: () => `${x},${y}`
});

/**
 * @param {Location} from
 * @param {Location} to
 */
const getDistance = (from, to) =>
    Math.pow(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2), 0.5);

module.exports = {
    setLocation,
    getDistance
};
