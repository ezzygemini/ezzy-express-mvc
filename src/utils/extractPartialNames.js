const PARTIAL_FIND_REG = /{{~?>\s+([^\s\}"']+).*}}/g;
const PARTIAL_NAME_REG = /{{~?>\s+([^\s\}"']+).*}}/;

/**
 * Extracts the names of the partials from the handlebars source code.
 * @param {string} source The handlebars source code.
 * @returns {string[]}
 */
const extractPartialNames = source =>
  ((source.match(PARTIAL_FIND_REG) || [])
    .map(partial => partial.replace(PARTIAL_NAME_REG, (a, b) => b)));

module.exports = extractPartialNames;
