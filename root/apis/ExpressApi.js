const Api = require('../../src/Api');

class ExpressApi extends Api {

  options() {
    return ['asdf'];
  }

  doGet(basics) {
    this.sendData(basics, {
      success: true
    }, {
      test: 1
    });
  }

  doPut(basics, data) {
    this.sendData(basics, {data});
    // basics.response.json({data});
  }

  doDelete(basics, error) {
    this[error](basics);
  }

  authPost(basics){
    return false;
  }

  doPatch(basics){
    throw "Error";
  }

}

module.exports = ExpressApi;
