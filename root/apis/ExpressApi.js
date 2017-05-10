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
    basics.response.json({data});
  }

  authPost(basics){
    return false;
  }

  doPatch(basics){
    throw "Error";
  }

}

module.exports = ExpressApi;
