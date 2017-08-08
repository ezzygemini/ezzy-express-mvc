const Api = require('../../src/Api');

module.exports = class ParameterApi extends Api {

  /**
   * Basic method to expose the parameters requested.
   * @param {HttpBasics} basics The http basics.
   * @returns {*}
   */
  doGet(basics) {
    return this.sendData(basics, basics.request.params);
  }

};
