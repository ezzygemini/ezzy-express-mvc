const Api = require('../../src/Api');

class ExpressApi extends Api {

  doGet(basics) {
    basics.response.json({
      success: true,
      alternate: true
    });
  }

}

module.exports = ExpressApi;
