process.env.NODE_ENV = 'development';
process.env.NODE_LOG_LEVEL = 'debug';

const xpr = require('express');
const ExpressMvc = require('../src/ExpressMvc');
const express = new ExpressMvc({
  directory: __dirname,
  statics: 'assets/',
  expressDependency: xpr,
  partialsDirectories: [
    __dirname + '/someRandomDirectory',
    __dirname + '/../root2/anotherRandomDirectory'
  ],
  otherStatics: [
    '/root3/someStaticDirectory/'
  ]
});
express.listen(3000);

module.exports = express;
