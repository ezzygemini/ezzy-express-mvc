const Api = require('../../src/Api');

class ExpressApi extends Api {

  options() {
    return ['asdf'];
  }

  doGet(basics) {
    basics.response.json({
      success: true
    });
  }

  doPut(basics, data) {
    basics.response.json({data});
  }

}

module.exports = ExpressApi;
