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

    const isForm = /multipart/i.test(basics.request.headers['content-type']);
    const qry = () => basics.request.params.path ?
      basics.request.params.path : basics.request.query;

    switch (req.method) {
      case 'GET':
        return this.doGet(basics, qry());
        break;
      case 'POST':
        if (isForm) {
          return this.doPost(basics);
        } else {
          return basics.body()
            .catch(qry)
            .then(body => this.doPost(basics, body));
        }
        break;
      case 'PATCH':
        if (isForm) {
          return this.doPatch(basics);
        } else {
          return basics.body()
            .catch(qry)
            .then(body => this.doPatch(basics, body));
        }
        break;
      case 'DELETE':
        if (isForm) {
          return this.doDelete(basics);
        } else {
          return basics.body()
            .catch(qry)
            .then(body => this.doDelete(basics, body));
        }
        break;
      case 'PUT':
        if (isForm) {
          return this.doPut(basics);
        } else {
          return basics.body()
            .catch(qry)
            .then(body => this.doPut(basics, body));
        }
        break;
      default:
        if (isForm) {
          return this.badRequest(basics);
        } else {
          return basics.body()
            .catch(qry)
            .then(body => this.badRequest(basics, body));
        }
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
   * @param {*=} data The data sent on the body.
   */
  doGet(basics, data) {
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
   * @param {*=} data The data sent on the body.
   */
  doPost(basics, data) {
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
   * @param {*=} data The data sent on the body.
   */
  doPatch(basics, data) {
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
   * @param {*=} data The data sent on the body.
   */
  doDelete(basics, data) {
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
   * @param {*=} data The data sent on the body.
   */
  doPut(basics, data) {
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
