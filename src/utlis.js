/**
 * @template T
 * @param {T} value 
 * @returns {T}
 */
function deep_copy(value) {
    return JSON.parse(JSON.stringify(value));
}

module.exports = deep_copy;
