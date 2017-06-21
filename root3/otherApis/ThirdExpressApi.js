const Api = require('../../src/Api');

/**
 * Testing API
 */
class ThirdExpressApi extends Api {

  /**
   * Get method.
   * @param basics
   */
  doGet(basics) {
    this.sendData(basics, {
      success: true
    });
  }

}

module.exports = ThirdExpressApi;
