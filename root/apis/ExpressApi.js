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

}

module.exports = ExpressApi;
