const handlebars = require('handlebars');

/**
 * Returns a properly formatted html attribute if the value exists.
 * @param attributeName
 * @param value
 */
const htmlAttribute = (attributeName, value) =>
  (value ? new handlebars.SafeString(` ${attributeName}="${value}"`) : '');

module.exports = htmlAttribute;
