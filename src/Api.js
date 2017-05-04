const Request = require('./Request');
const API_CONTENT_TYPE = '*/*';
const {version, name, description} = require('./package');

/**
 * Basic API class
 */
class Api extends Request {

  /**
   * Obtains the context of the application.
   * @returns {string}
   */
  get context() {
    return '';
  }

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
   * Decorates the data as an API call.
   * @param {HttpBasics} basics The http basics.
   * @param {number} status The http status.
   * @param {Object} headers Additional headers that will be appended.
   */
  static _decorateRequest(basics, status, headers = {}) {
    Object.assign(headers, {status, name, version, description});
    let header;
    for (let prop in headers) {
      if (headers.hasOwnProperty(prop)) {
        basics.response.set(`x-${prop}`, headers[prop]);
      }
    }
  }

  /**
   * Sends the requested data to the browser.
   * @param {HttpBasics} basics The http basics.
   * @param {*} data The data to send.
   * @param {object=} headers Additional headers to send.
   */
  sendData(basics, data, headers) {
    this.sendStatus(basics, 200);
    Api._decorateRequest(basics, 200, headers);
    basics.response.json(data);
  }

  /**
   * Sends a bad-request message response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  badRequest(basics, headers) {
    this.sendStatus(basics, 400);
    Api._decorateRequest(basics, 400, headers);
    basics.response.json(data);
  }

  /**
   * Sends a server error message response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  serverError(basics, headers) {
    this.sendStatus(basics, 500);
    Api._decorateRequest(basics, 500, headers);
    basics.response.json('Server Error');
  }

  /**
   * Sends an unauthroized response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  unauthorized(basics, headers) {
    this.sendStatus(basics, 401);
    Api._decorateRequest(basics, 401, headers);
    basics.response.json('Unauthorized');
  }

}

module.exports = Api;
