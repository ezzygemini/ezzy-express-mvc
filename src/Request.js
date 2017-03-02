const logger = require('logger').logger;
const DEFAULT_CONTENT_TYPE = '*/*';

class Request {

  /**
   * Handles the request based on method.
   * @param {HttpBasics} basics The HTTP Bascis.
   */
  doRequest(basics) {
    const req = basics.request;
    logger.debug({
      title: 'Request',
      message: `${req.method} ${req.hostname} ${req.url}`
    });
    switch (req.method) {
      case 'GET':
        this.doGet(basics);
        break;
      case 'POST':
        this.doPost(basics);
        break;
      case 'PATCH':
        this.doPatch(basics);
        break;
      case 'DELETE':
        this.doDelete(basics);
        break;
      case 'PUT':
        this.doPut(basics);
        break;
      default:
        this.badRequest(basics);
    }
  }

  /**
   * Obtains the options of the api.
   * @returns {*}
   */
  get options() {
  }

  /**
   * Basic GET handler.
   * @param {HttpBasics} basics The http basics.
   */
  doGet(basics) {
    this.sendStatus(basics, 501);
    basics.response.end();
  }

  /**
   * Indicates what content type is accepted on GET requests.
   * @returns {string}
   */
  get acceptGet() {
    return DEFAULT_CONTENT_TYPE;
  }

  /**
   * Basic POST handler.
   * @param {HttpBasics} basics The http basics.
   */
  doPost(basics) {
    this.sendStatus(basics, 501);
    basics.response.end();
  }

  /**
   * Indicates what content type is accepted on POST requests.
   * @returns {string}
   */
  get acceptPost() {
    return DEFAULT_CONTENT_TYPE;
  }

  /**
   * Basic PATCH handler.
   * @param {HttpBasics} basics The http basics.
   */
  doPatch(basics) {
    this.sendStatus(basics, 501);
    basics.response.end();
  }

  /**
   * Indicates what content type is accepted on PATCH requests.
   * @returns {string}
   */
  get acceptPatch() {
    return DEFAULT_CONTENT_TYPE;
  }

  /**
   * Basic DELETE handler.
   * @param {HttpBasics} basics The http basics.
   */
  doDelete(basics) {
    this.sendStatus(basics, 501);
    basics.response.end();
  }

  /**
   * Indicates what content type is accepted on DELETE requests.
   * @returns {string}
   */
  get acceptDelete() {
    return DEFAULT_CONTENT_TYPE;
  }

  /**
   * Basic PUT handler.
   * @param {HttpBasics} basics The http basics.
   */
  doPut(basics) {
    this.sendStatus(basics, 501);
    basics.response.end();
  }

  /**
   * Indicates what content type is accepted on PUT requests.
   * @returns {string}
   */
  get acceptPut() {
    return DEFAULT_CONTENT_TYPE;
  }

  /**
   * Sends a 500 error on the page.
   * @param {HttpBasics} basics The http basics.
   * @param {number} status The request status to send.
   */
  sendStatus(basics, status = 200) {
    if (status !== 200) {
      logger.warn(`Sending ${status} status`);
    } else {
      logger.debug(`Sending ${status} status`);
    }
    basics.response.status(status);
  }

}

module.exports = Request;
