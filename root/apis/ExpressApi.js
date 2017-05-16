const Request = require('../../src/Request');
const Api = require('../../src/Api');

class ExpressApi extends Api {

  options() {
    return ['asdf'];
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
    return Request[error](basics);
  }

  authPost(basics){
    return false;
  }

  doPatch(basics){
    throw "SomeError";
  }

}

module.exports = ExpressApi;
