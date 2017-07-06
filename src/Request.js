const logger = require('logger').logger;
const DEFAULT_CONTENT_TYPE = '*/*';
const {version, name, description} = require('./package');

class Request {

  /**
   * Handles the request based on method.
   * @param {HttpBasics} basics The HTTP Basics.
   */
  doRequest(basics) {
    const req = basics.request;

    logger.debug('Request', `${req.method} ${req.hostname} ${req.originalUrl}`);

    if (!this.loggedIn(basics)) {
      return Request.unauthorizedError(basics);
    } else if (!this.auth(basics)) {
      return Request.forbiddenError(basics);
    }

    const isForm = /multipart/i.test(basics.request.headers['content-type']);
    const qry = () => {
      if (basics.request.originalUrl.indexOf('?') > -1) {
        return [basics.request.query];
      } else {
        const args = [];
        for (let char of 'abcdefghijklm'.split('')) {
          if (basics.request.params[char] !== undefined) {
            args.push(basics.request.params[char]);
          } else {
            break;
          }
        }
        return args;
      }
    };

    switch (req.method) {
      case 'GET':

        if (this.authGet(basics)) {
          return this.doGet(basics, ...qry());
        } else {
          return Request.forbiddenError(basics);
        }

        break;
      case 'POST':

        if (this.authPost(basics)) {
          if (isForm) {
            return this.doPost(basics);
          } else {
            return basics.body()
              .then(body => [body], qry)
              .then(args => {
                try {
                  return this.doPost(basics, ...args);
                } catch (e) {
                  return Request.internalServerError(basics);
                }
              });
          }
        } else {
          return Request.forbiddenError(basics);
        }

        break;
      case 'PATCH':

        if (this.authPatch(basics)) {
          if (isForm) {
            return this.doPatch(basics);
          } else {
            return basics.body()
              .then(body => [body], qry)
              .then(args => {
                try {
                  return this.doPatch(basics, ...args);
                } catch (e) {
                  return Request.internalServerError(basics);
                }
              });
          }
        } else {
          return Request.forbiddenError(basics);
        }

        break;
      case 'DELETE':

        if (this.authDelete(basics)) {
          if (isForm) {
            return this.doDelete(basics);
          } else {
            return basics.body()
              .then(body => [body], qry)
              .then(args => {
                try {
                  return this.doDelete(basics, ...args);
                } catch (e) {
                  return Request.internalServerError(basics);
                }
              });
          }
        } else {
          return Request.forbiddenError(basics);
        }

        break;
      case 'PUT':

        if (this.authPut(basics)) {
          if (isForm) {
            return this.doPut(basics);
          } else {
            return basics.body()
              .then(body => [body], qry)
              .then(args => {
                try {
                  return this.doPut(basics, ...args);
                } catch (e) {
                  return Request.internalServerError(basics);
                }
              });
          }
        } else {
          return Request.forbiddenError(basics);
        }

        break;
      default:

        if (isForm) {
          return Request.badRequestError(basics);
        } else {
          return basics.body()
            .then(body => [body], qry)
            .then(args => Request.badMethodError(basics, ...args)
              .catch(e => Request.internalServerError(basics)));
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
   * Checks if the user has been logged in.
   * @returns {boolean}
   */
  loggedIn(basics) {
    return true;
  }

  /**
   * Authorizes the request of all methods.
   * @param {HttpBasics} basics The http basics.
   * @returns {boolean}
   */
  auth(basics) {
    return true;
  }

  /**
   * Authorizes the request and checks if we can continue with a GET request.
   * @param {HttpBasics} basics The http basics.
   * @returns {boolean}
   */
  authGet(basics) {
    return true;
  }

  /**
   * Basic GET handler.
   * @param {HttpBasics} basics The http basics.
   * @param {*=} data The data sent on the body.
   */
  doGet(basics, data) {
    return Request.methodNotAllowedError(basics);
  }

  /**
   * Indicates what content type is accepted on GET requests.
   * @returns {string}
   */
  get acceptGet() {
    return DEFAULT_CONTENT_TYPE;
  }

  /**
   * Authorizes the request and checks if we can continue with a POST request.
   * @param {HttpBasics} basics The http basics.
   * @returns {boolean}
   */
  authPost(basics) {
    return true;
  }

  /**
   * Basic POST handler.
   * @param {HttpBasics} basics The http basics.
   * @param {*=} data The data sent on the body.
   */
  doPost(basics, data) {
    return Request.methodNotAllowedError(basics);
  }

  /**
   * Indicates what content type is accepted on POST requests.
   * @returns {string}
   */
  get acceptPost() {
    return DEFAULT_CONTENT_TYPE;
  }

  /**
   * Authorizes the request and checks if we can continue with a PATCH request.
   * @param {HttpBasics} basics The http basics.
   * @returns {boolean}
   */
  authPatch(basics) {
    return true;
  }

  /**
   * Basic PATCH handler.
   * @param {HttpBasics} basics The http basics.
   * @param {*=} data The data sent on the body.
   */
  doPatch(basics, data) {
    return Request.methodNotAllowedError(basics);
  }

  /**
   * Indicates what content type is accepted on PATCH requests.
   * @returns {string}
   */
  get acceptPatch() {
    return DEFAULT_CONTENT_TYPE;
  }

  /**
   * Authorizes the request and checks if we can continue with a DELETE request.
   * @param {HttpBasics} basics The http basics.
   * @returns {boolean}
   */
  authDelete(basics) {
    return true;
  }

  /**
   * Basic DELETE handler.
   * @param {HttpBasics} basics The http basics.
   * @param {*=} data The data sent on the body.
   */
  doDelete(basics, data) {
    return Request.methodNotAllowedError(basics);
  }

  /**
   * Indicates what content type is accepted on DELETE requests.
   * @returns {string}
   */
  get acceptDelete() {
    return DEFAULT_CONTENT_TYPE;
  }

  /**
   * Authorizes the request and checks if we can continue with a PUT request.
   * @param {HttpBasics} basics The http basics.
   * @returns {boolean}
   */
  authPut(basics) {
    return true;
  }

  /**
   * Basic PUT handler.
   * @param {HttpBasics} basics The http basics.
   * @param {*=} data The data sent on the body.
   */
  doPut(basics, data) {
    return Request.methodNotAllowedError(basics);
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
  static sendStatus(basics, status = 200) {
    if (status !== 200) {
      logger.warn(`Sending ${status} status`);
    }
    basics.response.status(status);
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static badRequestError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 400, 'Bad Request');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static unauthorizedError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 401, 'Unauthorized');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static paymentRequiredError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 402, 'Payment Required');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static forbiddenError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 403, 'Forbidden');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static notFoundError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 404, 'Not Found');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static methodNotAllowedError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 405, 'Method Not Allowed');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static notAcceptableError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 406, 'Not Acceptable');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static proxyAuthenticationRequiredError(basics, headers) {
    return Request
      ._sendErrorStatus(basics, headers, 407, 'Proxy Authentication Required');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static requestTimeoutError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 408, 'Request Time-out');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static conflictError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 409, 'Conflict');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static goneError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 410, 'Gone');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static lengthRequiredError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 411, 'Length Required');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static preconditionFailedError(basics, headers) {
    return Request
      ._sendErrorStatus(basics, headers, 412, 'Precondition Failed');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static requestEntityTooLargeError(basics, headers) {
    return Request
      ._sendErrorStatus(basics, headers, 413, 'Request Entity Too Large');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static requesturiTooLargeError(basics, headers) {
    return Request
      ._sendErrorStatus(basics, headers, 414, 'Request-URI Too Large');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static unsupportedMediaTypeError(basics, headers) {
    return Request
      ._sendErrorStatus(basics, headers, 415, 'Unsupported Media Type');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static requestedRangeNotSatisfiableError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 416,
      'Requested Range Not Satisfiable');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static expectationFailedError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 417, 'Expectation Failed');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static unprocessableEntityError(basics, headers) {
    return Request
      ._sendErrorStatus(basics, headers, 422, 'Unprocessable Entity');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static lockedError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 423, 'Locked');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static failedDependencyError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 424, 'Failed Dependency');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static unorderedCollectionError(basics, headers) {
    return Request
      ._sendErrorStatus(basics, headers, 425, 'Unordered Collection');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static upgradeRequiredError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 426, 'Upgrade Required');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static preconditionRequiredError(basics, headers) {
    return Request
      ._sendErrorStatus(basics, headers, 428, 'Precondition Required');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static tooManyRequestsError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 429, 'Too Many Requests');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static requestHeaderFieldsTooLargeError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 431,
      'Request Header Fields Too Large');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static internalServerError(basics, headers) {
    return Request
      ._sendErrorStatus(basics, headers, 500, 'Internal Server Error');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static notImplementedError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 501, 'Not Implemented');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static badGatewayError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 502, 'Bad Gateway');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static serviceUnavailableError(basics, headers) {
    return Request
      ._sendErrorStatus(basics, headers, 503, 'Service Unavailable');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static gatewayTimeoutError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 504, 'Gateway Timeout');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static httpVersionNotSupportedError(basics, headers) {
    return Request
      ._sendErrorStatus(basics, headers, 505, 'HTTP Version Not Supported');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static variantAlsoNegotiatesError(basics, headers) {
    return Request
      ._sendErrorStatus(basics, headers, 406, 'Variant Also Negotiates');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static insufficientStorageError(basics, headers) {
    return Request
      ._sendErrorStatus(basics, headers, 507, 'Insufficient Storage');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static bandwidthLimitExceededError(basics, headers) {
    return Request
      ._sendErrorStatus(basics, headers, 509, 'Bandwidth Limit Exceeded');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static notExtendedError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 510, 'Not Extended');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static networkAuthenticationRequiredError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 511,
      'Network Authentication Required');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static badDigestError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 400, 'Bad Request');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static badMethodError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 405, 'Method Not Allowed');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static internalError(basics, headers) {
    return Request
      ._sendErrorStatus(basics, headers, 500, 'Internal Server Error');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static invalidArgumentError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 409, 'Conflict');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static invalidContentError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 400, 'Bad Request');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static invalidCredentialsError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 401, 'Unauthorized');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static invalidHeaderError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 400, 'Bad Request');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static invalidVersionError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 400, 'Bad Request');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static missingParameterError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 409, 'Conflict');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static notAuthorizedError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 403, 'Forbidden');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static requestExpiredError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 400, 'Bad Request');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static requestThrottledError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 429, 'Too Many Requests');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static resourceNotFoundError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 404, 'Not Found');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  static wrongAcceptError(basics, headers) {
    return Request._sendErrorStatus(basics, headers, 406, 'Not Acceptable');
  }

  /**
   * Sends the error to the server.
   * @param {HttpBasics} basics The http basics.
   * @param {number} status The http status code.
   * @param {?object=} headers The headers to send along.
   * @param {?string|object=} error The data/message to send.
   * @returns {void}
   * @private
   */
  static _sendErrorStatus(basics, headers, status, error) {
    Request._decorateRequest(basics, status, headers);
    Request.sendStatus(basics, status);
    basics.response.json(typeof error === 'string' ? {error, status} : error);
  }

  /**
   * Decorates the data as an API call.
   * @param {HttpBasics} basics The http basics.
   * @param {number} status The http status.
   * @param {Object} headers Additional headers that will be appended.
   */
  static _decorateRequest(basics, status, headers = {}) {
    Object.assign(headers, {status, name, version, description});
    basics.response
      .set('x-version-requested', basics.request.params.version || 'latest');
    for (let prop in headers) {
      if (headers.hasOwnProperty(prop)) {
        if (prop.toLowerCase() !== 'access-control-allow-origin') {
          basics.response.set(`x-${prop}`, headers[prop]);
        } else {
          basics.response.set(prop, headers[prop]);
        }
      }
    }
  }

}

module.exports = Request;
