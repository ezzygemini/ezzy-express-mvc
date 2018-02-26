const path = require('path');
const fs = require('fs');

const packageJson = path.normalize(__dirname + '/../../../package.json');
const rootDir = path
  .normalize(__dirname + (fs.existsSync(packageJson) ? '/../../../' : '/../'));
module.exports = rootDir;
