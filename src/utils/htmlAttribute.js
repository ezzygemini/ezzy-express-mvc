const handlebars = require('handlebars');

/**
 * Returns a properly formatted html attribute if the value exists.
 * @param {string} attributeName The attribute name to apply.
 * @param {*} value The value to check.
 */
const htmlAttribute = (attributeName, value) => {
  if (value === true || value === attributeName) {
    return new handlebars.SafeString(` ${attributeName}`);
  } else if (value) {
    return new handlebars.SafeString(` ${attributeName}="${value}"`);
  } else {
    return '';
  }
};

module.exports = htmlAttribute;
