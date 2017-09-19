const Api = require('../../src/Api');

class ExpressApi extends Api {

  options() {
    return ['asdf'];
  }

  doOptions(basics) {
    return this.sendData(basics, {success: true});
  }

  doHead(basics) {
    return this.sendData(basics, {success: true});
  }

  doGet(basics) {
    return this.sendData(basics, {
      success: true
    }, {
      test: 1
    });
  }

  doPut(basics, data) {
    return this.sendData(basics, {data});
  }

  doDelete(basics, error) {
    return this[error](basics);
  }

  authPost(basics) {
    return false;
  }

  doPatch(basics) {
    throw "SomeError";
  }

}

module.exports = ExpressApi;
