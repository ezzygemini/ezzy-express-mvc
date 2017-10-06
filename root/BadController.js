const Controller = require('../../src/Controller');

module.exports = class BadController extends Controller {

  /**
   * Determines if the request is ok to continue.
   * @param {HttpBasics} basics The http basics.
   * @returns {boolean}
   */
  isRequestOk(basics) {
    return false;
  }

};
