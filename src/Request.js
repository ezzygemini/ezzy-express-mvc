const path = require('path');
const logger = require('ezzy-logger').logger;
const stack = require('callsite');
const DEFAULT_CONTENT_TYPE = '*/*';
const {version, name, description} = require('./package');
let inst;

/**
 * @type {RegExp}
 */
const FILE_SKIPPED =
  /(Request|Controller|Api|api|controller|index)\.js$/;

/**
 * Base class that handles a request.
 */
class Request {

  /**
   * Constructor.
   */
  constructor() {
    /**
     * The context in which this request is bound.
     * @type {string|null}
     * @private
     */
    this._context = null;

    /**
     * The custom errors to use when displaying status codes.
     * @type {null|Promise}
     * @private
     */
    this._errors = null;
  }

  /**
   * Default request instance.
   * @returns {Request}
   */
  static get inst() {
    if (!inst) {
      inst = new Request();
    }
    return inst;
  }

  /**
   * The context of the request.
   * @returns {string|null}
   */
  get context() {
    return this._context;
  }

  /**
   * The context of the request.
   * @param {string|null} val The context of the request.
   */
  set context(val) {
    this._context = val;
  }

  /**
   * Handles the request based on method.
   * @param {HttpBasics} basics The HTTP Basics.
   */
  doRequest(basics) {
    const req = basics.request;

    logger.debug('Request', `${req.method} ${req.hostname} ${req.originalUrl}`);

    const auth = this.auth(basics);
    if (!auth && !this.loggedIn(basics)) {
      return this.unauthorizedError(basics);
    } else if (!auth) {
      return this.forbiddenError(basics);
    }

    const isForm = /multipart/i.test(basics.request.headers['content-type']);
    const qry = () => {
      if (basics.request.originalUrl.indexOf('?') > -1) {
        return [basics.request.query];
      } else {
        const args = [];
        let arg;
        for (let char of 'abcdefghijklm'.split('')) {
          arg = basics.request.params[char];
          if (arg !== undefined) {
            args.push(isNaN(arg) ? arg : parseFloat(arg));
          } else {
            break;
          }
        }
        return args;
      }
    };

    switch (req.method) {
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
                  return this.internalServerError(basics);
                }
              });
          }
        } else {
          return this.forbiddenError(basics);
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
                  return this.internalServerError(basics);
                }
              });
          }
        } else {
          return this.forbiddenError(basics);
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
                  return this.internalServerError(basics);
                }
              });
          }
        } else {
          return this.forbiddenError(basics);
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
                  return this.internalServerError(basics);
                }
              });
          }
        } else {
          return this.forbiddenError(basics);
        }

        break;
      case 'HEAD':

        if (this.authHead(basics)) {
          return this.doHead(basics, ...qry());
        } else {
          return this.forbiddenError(basics);
        }

        break;
      case 'OPTIONS':

        if (this.authOptions(basics)) {
          return this.doOptions(basics, ...qry());
        } else {
          return this.forbiddenError(basics);
        }

        break;
      default:

        if (this.authGet(basics)) {
          return this.doGet(basics, ...qry());
        } else {
          return this.forbiddenError(basics);
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
   * Authorizes the request and checks if we can continue with an OPTIONS
   * request.
   * @param {HttpBasics} basics The http basics.
   * @returns {boolean}
   */
  authOptions(basics) {
    return true;
  }

  /**
   * Basic OTPIONS handler.
   * @param {HttpBasics} basics The http basics.
   * @param {*=} data The data sent on the body.
   */
  doOptions(basics, data) {
    return this.methodNotAllowedError(basics);
  }

  /**
   * Authorizes the request and checks if we can continue with a HEAD request.
   * @param {HttpBasics} basics The http basics.
   * @returns {boolean}
   */
  authHead(basics) {
    return true;
  }

  /**
   * Basic OTPIONS handler.
   * @param {HttpBasics} basics The http basics.
   * @param {*=} data The data sent on the body.
   */
  doHead(basics, data) {
    return this.methodNotAllowedError(basics);
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
    return this.methodNotAllowedError(basics);
  }

  /**
   * Indicates what content type is accepted on GET requests.
   * @returns {string}
   */
  get acceptGet() {
    return DEFAULT_CONTENT_TYPE;
  }

  /**
   * The path that's assigned to the parameter variables.
   * @returns {string}
   */
  get path() {
    return '';
  }

  /**
   * Any number of core middleware functions that will parse the request.
   * @returns {function|function[]|null}
   */
  get middleware() {
    return null;
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
    return this.methodNotAllowedError(basics);
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
    return this.methodNotAllowedError(basics);
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
    return this.methodNotAllowedError(basics);
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
    return this.methodNotAllowedError(basics);
  }

  /**
   * Indicates what content type is accepted on PUT requests.
   * @returns {string}
   */
  get acceptPut() {
    return DEFAULT_CONTENT_TYPE;
  }

  /**
   * Sends a status to the page.
   * @param {HttpBasics} basics The http basics.
   * @param {number} status The request status to send.
   */
  sendStatus(basics, status = 200) {
    if (status !== 200) {
      logger.warn(Request.getLastCall(),
        `Sending ${status} status ${basics.request.originalUrl}`);
    }
    try {
      basics.response.status(status);
    } catch (e) {
      logger.error('Status Code', e);
    }
  }

  /**
   * Obtains the last file name.
   */
  static getLastCall() {
    const lastFile = stack()
      .find(item => !FILE_SKIPPED.test(item.getFileName()));
    if (!lastFile) {
      return '';
    }
    const fileName = lastFile.getFileName();
    return (fileName ? path.basename(fileName) : '') +
      ':' + lastFile.getLineNumber();
  }

  /**
   * Sends a status to the page and sends final content.
   * @param {HttpBasics} basics The http basics.
   * @param {number} status The request status to send.
   * @param {string|undefined=} finalContent The final content to send.
   */
  sendStatusAndEnd(basics, status, finalContent) {
    this.sendStatus(basics, status);
    basics.response.end(finalContent);
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  badRequestError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 400, 'Bad Request');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  unauthorizedError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 401, 'Unauthorized');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  paymentRequiredError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 402, 'Payment Required');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  forbiddenError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 403, 'Forbidden');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  notFoundError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 404, 'Not Found');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  methodNotAllowedError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 405, 'Method Not Allowed');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  notAcceptableError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 406, 'Not Acceptable');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  proxyAuthenticationRequiredError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 407,
      'Proxy Authentication Required');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  requestTimeoutError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 408, 'Request Time-out');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  conflictError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 409, 'Conflict');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  goneError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 410, 'Gone');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  lengthRequiredError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 411, 'Length Required');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  preconditionFailedError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 412, 'Precondition Failed');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  requestEntityTooLargeError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 413,
      'Request Entity Too Large');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  requesturiTooLargeError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 414, 'Request-URI Too Large');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  unsupportedMediaTypeError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 415,
      'Unsupported Media Type');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  requestedRangeNotSatisfiableError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 416,
      'Requested Range Not Satisfiable');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  expectationFailedError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 417, 'Expectation Failed');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  unprocessableEntityError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 422, 'Unprocessable Entity');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  lockedError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 423, 'Locked');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  failedDependencyError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 424, 'Failed Dependency');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  unorderedCollectionError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 425, 'Unordered Collection');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  upgradeRequiredError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 426, 'Upgrade Required');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  preconditionRequiredError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 428, 'Precondition Required');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  tooManyRequestsError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 429, 'Too Many Requests');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  requestHeaderFieldsTooLargeError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 431,
      'Request Header Fields Too Large');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  internalServerError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 500, 'Internal Server Error');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  notImplementedError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 501, 'Not Implemented');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  badGatewayError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 502, 'Bad Gateway');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  serviceUnavailableError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 503, 'Service Unavailable');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  gatewayTimeoutError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 504, 'Gateway Timeout');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  httpVersionNotSupportedError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 505,
      'HTTP Version Not Supported');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  variantAlsoNegotiatesError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 406,
      'Variant Also Negotiates');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  insufficientStorageError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 507, 'Insufficient Storage');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  bandwidthLimitExceededError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 509,
      'Bandwidth Limit Exceeded');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  notExtendedError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 510, 'Not Extended');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  networkAuthenticationRequiredError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 511,
      'Network Authentication Required');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  badDigestError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 400, 'Bad Request');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  badMethodError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 405, 'Method Not Allowed');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  internalError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 500, 'Internal Server Error');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  invalidArgumentError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 409, 'Conflict');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  invalidContentError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 400, 'Bad Request');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  invalidCredentialsError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 401, 'Unauthorized');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  invalidHeaderError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 400, 'Bad Request');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  invalidVersionError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 400, 'Bad Request');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  missingParameterError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 409, 'Conflict');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  notAuthorizedError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 403, 'Forbidden');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  requestExpiredError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 400, 'Bad Request');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  requestThrottledError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 429, 'Too Many Requests');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  resourceNotFoundError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 404, 'Not Found');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  wrongAcceptError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 406, 'Not Acceptable');
  }

  /**
   * Decorates the data as an API call.
   * @param {HttpBasics} basics The http basics.
   * @param {number} status The http status.
   * @param {Object} headers Additional headers that will be appended.
   */
  decorateRequest(basics, status, headers = {}) {
    Object.assign(headers, {status, name, version, description});
    try {
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
    } catch (e) {
      logger.error('Headers', e);
    }
  }

  /**
   * Sends the error to the server.
   * @param {HttpBasics} basics The http basics.
   * @param {number} status The http status code.
   * @param {object|string=} headers The headers to send along.
   * @param {string|object=} error The data/message to send.
   * @returns {void}
   * @private
   */
  _sendErrorStatus(basics, headers, status, error) {
    if (typeof headers === 'string') {
      error = headers;
      headers = undefined;
    }
    this.decorateRequest(basics, status, headers);
    this.sendStatus(basics, status);
    const {accept} = basics.request.headers;
    if (this._errors && accept && /(text\/html|text\/plain)/i.test(accept)) {
      this._errors.then(errors => {
        let generatedContent;
        if (errors[status]) {
          generatedContent = errors[status]({status});
        } else {
          generatedContent = errors.general(status);
        }
        basics.response.end(generatedContent);
      });
    } else {
      basics.response.json(typeof error === 'string' ? {error, status} : error);
    }
  }

}

module.exports = Request;
