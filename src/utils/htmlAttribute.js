const handlebars = require('handlebars');

/**
 * Returns a properly formatted html attribute if the value exists.
 * @param {string} attributeName The attribute name to apply.
 * @param {*} value The value to check.
 */
const htmlAttribute = (attributeName, value) =>
  (value ? new handlebars.SafeString(` ${attributeName}="${value}"`) : '');

module.exports = htmlAttribute;
