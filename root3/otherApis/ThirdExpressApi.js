const Api = require('../../src/Api');

/**
 * Testing API
 */
class ThirdExpressApi extends Api {

  /**
   * Get method.
   * @param {HttpBasics} basics The http basics.
   */
  doGet(basics) {
    this.sendData(basics, {
      success: true
    });
  }

  /**
   * Post method.
   * @param {HttpBasics} basics The http basics.
   */
  doPost(basics) {
    this.sendStatusAndEnd(basics, 200, 'done');
  }

}

module.exports = ThirdExpressApi;
