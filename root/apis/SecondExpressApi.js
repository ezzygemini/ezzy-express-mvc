const Api = require('../../src/Api');

class SecondExpressApi extends Api {

  doGet(basics) {
    return this.sendData(basics, {
      success: true
    })
  }

}

module.exports = SecondExpressApi;
