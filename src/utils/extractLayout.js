const LAYOUT_REG = /{{!<\s*([\w\/.]+)\s*}}/i;

/**
 * Extracts the layout name from the handlebars source code.
 * @param {string} source The handlebars source code.
 * @returns {string|null}
 */
const extractLayout = source => {
  const matches = source.match(LAYOUT_REG);
  return matches ? matches[1] : null;
};

module.exports = extractLayout;
