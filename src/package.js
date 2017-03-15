let pkg;
try {
  pkg = require('../../../package.json');
} catch (e) {
  pkg = {version: '0.0.0', name: 'Undefined', description: 'N/A'};
}
module.exports = pkg;
