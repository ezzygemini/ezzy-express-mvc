const Api = require('../../src/Api');

class SecondExpressApi extends Api {

  doGet(basics) {
    basics.response.json({
      success: true
    });
  }

}

module.exports = SecondExpressApi;
