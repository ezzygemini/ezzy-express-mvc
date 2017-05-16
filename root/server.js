process.env.NODE_ENV = 'development';
process.env.NODE_LOG_LEVEL = 'debug';

const xpr = require('express');
const ExpressMvc = require('../src/ExpressMvc');
const express = new ExpressMvc(__dirname, undefined, undefined, 'assets/', xpr);
express.listen(3000);

module.exports = express;
