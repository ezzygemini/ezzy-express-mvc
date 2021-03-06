const Api = require('../../src/Api');

/**
 * Testing API
 */
class ExpressApi extends Api {

  /**
   * Get method.
   * @param basics
   */
  doGet(basics) {
    this.sendData(basics, {
      success: true,
      alternate: true
    });
  }

}

module.exports = ExpressApi;
