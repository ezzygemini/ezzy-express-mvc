const Api = require('../../src/Api');

class ThirdApi extends Api {

  doGet(basics, a, b, c) {
    return this.sendData(basics, {a, b, c})
  }

  doPost(basics, a, b, c) {
    return this.sendData(basics, {a, b, c})
  }

  doPut(basics, a, b, c) {
    return this.sendData(basics, {a, b, c})
  }

  doPatch(basics, a, b, c) {
    return this.sendData(basics, {a, b, c})
  }

  doDelete(basics, a, b, c) {
    return this.sendData(basics, {a, b, c})
  }

}

module.exports = ThirdApi;
