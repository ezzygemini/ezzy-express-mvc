const {logger} = require('logger');
const Request = require('./Request');
const API_CONTENT_TYPE = '*/*';

/**
 * Basic API class
 */
class Api extends Request {

  /**
   * Indicates what content type is accepted on GET requests.
   * @returns {string}
   */
  get acceptGet() {
    return API_CONTENT_TYPE;
  }

  /**
   * Indicates what content type is accepted on POST requests.
   * @returns {string}
   */
  get acceptPost() {
    return API_CONTENT_TYPE;
  }

  /**
   * Indicates what content type is accepted on PATCH requests.
   * @returns {string}
   */
  get acceptPatch() {
    return API_CONTENT_TYPE;
  }

  /**
   * Indicates what content type is accepted on DELETE requests.
   * @returns {string}
   */
  get acceptDelete() {
    return API_CONTENT_TYPE;
  }

  /**
   * Indicates what content type is accepted on PUT requests.
   * @returns {string}
   */
  get acceptPut() {
    return API_CONTENT_TYPE;
  }

  /**
   * Sends the requested data to the browser.
   * @param {HttpBasics} basics The http basics.
   * @param {*} data The data to send.
   * @param {object=} headers Additional headers to send.
   */
  sendData(basics, data, headers) {
    this.sendStatus(basics, 200);
    this.decorateRequest(basics, 200, headers);
    try {
      basics.response.json(data);
    } catch (e) {
      logger.error('Response', e);
    }
  }

}

module.exports = Api;
