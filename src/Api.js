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
    return this._sendErrorStatus(basics, headers, 401, data);
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  serverError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 401, 'Server Error');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  unauthorized(basics, headers) {
    return this._sendErrorStatus(basics, headers, 401, 'Unauthorized');
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
    return Api
      ._sendErrorStatus(basics, headers, 407, 'Proxy Authentication Required');
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
    return Api
      ._sendErrorStatus(basics, headers, 413, 'Request Entity Too Large');
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
    return this._sendErrorStatus(basics, headers, 415, 'Unsupported Media Type');
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
    return Api
      ._sendErrorStatus(basics, headers, 505, 'HTTP Version Not Supported');
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  variantAlsoNegotiatesError(basics, headers) {
    return Api
      ._sendErrorStatus(basics, headers, 406, 'Variant Also Negotiates');
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
    return Api
      ._sendErrorStatus(basics, headers, 509, 'Bandwidth Limit Exceeded');
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
   * Sends the error to the server.
   * @param {HttpBasics} basics The http basics.
   * @param {number} status The http status code.
   * @param {?object=} headers The headers to send along.
   * @param {?string|object=} msg The data/message to send.
   * @returns {void}
   * @private
   */
  _sendErrorStatus(basics, headers, status, msg) {
    this.sendStatus(basics, status);
    Api._decorateRequest(basics, status, headers);
    basics.response.json(msg);
  }

}

module.exports = Api;
