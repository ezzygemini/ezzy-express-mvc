process.env.NODE_ENV = 'development';
process.env.NODE_LOG_LEVEL = 'debug';

const ExpressMvc = require('../src/ExpressMvc', null, require('express'));
const express = new ExpressMvc('./');

express.listen(3000);

module.exports = express;
