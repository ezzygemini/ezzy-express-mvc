const Request = require('./Request');
const API_CONTENT_TYPE = '*/*';

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
   * @param {*} data The data to use.
   * @param {Object} metaData Additional meta data to send.
   * @returns {Object}
   */
  static _decorateData(basics, status, data, metaData = {}) {
    return Object.assign(metaData, {
      data, status, name, version, description
    });
  }

  /**
   * Sends the requested data to the browser.
   * @param {HttpBasics} basics The http basics.
   * @param {*} data The data to send.
   * @param {object=} metaData Additional meta data to send.
   */
  sendData(basics, data, metaData) {
    super.sendStatus(basics, 200);
    basics.response.json(Api._decorateData(basics, 200, data, metaData));
  }

  /**
   * Sends a bad-request message response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} metaData Additional meta data to send.
   */
  badRequest(basics, metaData) {
    super.sendStatus(basics, 400);
    basics.response
      .json(Api._decorateData(basics, 400, 'Bad Request', metaData));
  }

  /**
   * Sends an unauthroized response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} metaData Additional meta data to send.
   */
  unauthorized(basics, metaData) {
    super.sendStatus(basics, 401);
    basics.response
      .json(Api._decorateData(basics, 401, 'Unauthorized', metaData));
  }

}

module.exports = Api;
