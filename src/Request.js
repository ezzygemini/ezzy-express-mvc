const { logger } = require("ezzy-logger");
const DEFAULT_CONTENT_TYPE = "*/*";
const { version, name, description } = require("./package");
const configSetup = require("ezzy-config-setup");
let inst;

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
   * Flag that could be turned on or off to indicate if we need to send headers.
   * @returns {boolean}
   */
  get sendHeaders() {
    return true;
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
   * Checks a url for named/positioned arguments.
   * @param {HttpBasics} basics The http basics.
   * @returns {*[]}
   * @private
   */
  _getArgsFromUrl(basics) {
    const { originalUrl, query, params } = basics.request;
    if (originalUrl.includes("?")) {
      // If a search query has been invoked, just return it as a single string.
      return [query];
    } else {
      const args = [];
      let arg;

      // We iterate through characters because we have defined routes
      // with optional parameters like these:
      // /my/route/:a?/:b?/:c?/:d?/:e?/:f?/:g?/:h?/:i?/:j?/:k?/:l?/:m?
      for (let char of "abcdefghijklm".split("")) {
        arg = params[char];
        if (arg !== undefined) {
          if (arg === "true") {
            // turn a "true" string to a true boolean
            args.push(true);
          } else if (arg === "false") {
            // turn a "false" string to a false boolean
            args.push(false);
          } else if (!isNaN(arg)) {
            // turn a numeric value to a number
            args.push(parseFloat(arg));
          } else {
            args.push(arg);
          }
        } else {
          break;
        }
      }

      // If a path configuration has been defined, we can use it to
      // map named keys to the values.
      const { pathConfig } = this;
      // Map the values to the positioned params
      if (Array.isArray(pathConfig)) {
        Object.assign(
          basics.request.params,
          configSetup({}, args, ...pathConfig)
        );
      }

      return args;
    }
  }

  /**
   * Obtains a set of arguments from either the body or the url.
   * @param {HttpBasics} basics The http basics.
   * @returns {Promise<*[]>}
   * @private
   */
  async _getArgsFromReq(basics) {
    try {
      return await basics.body().then(body => [body]);
    } catch (e) {
      return this._getArgsFromUrl(basics);
    }
  }

  /**
   * Handles the request based on method.
   * @param {HttpBasics} basics The HTTP Basics.
   */
  async doRequest(basics) {
    logger.deepDebug(
      basics,
      "Interception",
      `Request intercepted by ${this.constructor.name}`
    );

    if (!(await this.isRequestOk(basics))) {
      return this.requestNotOk(basics);
    } else {
      await this.requestOk(basics);
    }

    const { headers, method, hostname, originalUrl } = basics.request;

    logger.debug(basics, "Request", `${method} ${hostname} ${originalUrl}`);
    logger.deepDebug(basics, "Headers", headers);

    const isAuth = await this.auth(basics);

    if (!isAuth && !(await this.loggedIn(basics))) {
      return this.unauthorizedError(basics);
    } else if (!isAuth) {
      return this.forbiddenError(basics);
    }

    const isFormRequest = /multipart/i.test(headers["content-type"]);

    switch (method) {
      case "POST":
        if (!(await this.authPost(basics))) {
          return this.forbiddenError(basics);
        } else if (isFormRequest) {
          return this.doPost(basics);
        } else {
          try {
            return this.doPost(basics, ...(await this._getArgsFromReq(basics)));
          } catch (e) {
            return this.internalServerError(basics);
          }
        }

      case "PATCH":
        if (!(await this.authPatch(basics))) {
          return this.forbiddenError(basics);
        } else if (isFormRequest) {
          return this.doPatch(basics);
        } else {
          try {
            return this.doPatch(
              basics,
              ...(await this._getArgsFromReq(basics))
            );
          } catch (e) {
            return this.internalServerError(basics);
          }
        }

      case "DELETE":
        if (!(await this.authDelete(basics))) {
          return this.forbiddenError(basics);
        } else if (isFormRequest) {
          return this.doDelete(basics);
        } else {
          try {
            return this.doDelete(
              basics,
              ...(await this._getArgsFromReq(basics))
            );
          } catch (e) {
            return this.internalServerError(basics);
          }
        }

      case "PUT":
        if (!(await this.authPut(basics))) {
          return this.forbiddenError(basics);
        } else if (isFormRequest) {
          return this.doPut(basics);
        } else {
          try {
            return this.doPut(basics, ...(await this._getArgsFromReq(basics)));
          } catch (e) {
            return this.internalServerError(basics);
          }
        }

      case "HEAD":
        if (await this.authHead(basics)) {
          return this.doHead(basics, ...this._getArgsFromUrl(basics));
        } else {
          return this.forbiddenError(basics);
        }

      case "OPTIONS":
        if (await this.authOptions(basics)) {
          return this.doOptions(basics, ...this._getArgsFromUrl(basics));
        } else {
          return this.forbiddenError(basics);
        }

      default:
        if (await this.authGet(basics)) {
          return this.doGet(basics, ...this._getArgsFromUrl(basics));
        } else {
          return this.forbiddenError(basics);
        }
    }
  }

  /**
   * Obtains the options of the api.
   * @returns {*}
   */
  get options() {}

  /**
   * Checking if the request is ok.
   * @param {HttpBasics} basics The http basics.
   * @returns {boolean}
   */
  isRequestOk(basics) {
    return true;
  }

  /**
   * Adding a method that allows different error handling.
   * @param {HttpBasics} basics The http basics.
   * @returns {*}
   */
  requestNotOk(basics) {
    return this.badRequestError(basics);
  }

  /**
   * Handles the request when it's ok.
   * @param {HttpBasics} basics The http basics.
   */
  requestOk(basics) {}

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
   * Basic HEAD handler. Simply returns a 200 status.
   * @param {HttpBasics} basics The http basics.
   * @param {*=} data The data sent on the body.
   */
  doHead(basics, data) {
    return this.sendStatusAndEnd(basics, 200);
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
    return "";
  }

  /**
   * The paths to bind the request to.
   * @returns {Array}
   */
  get paths() {
    return [];
  }

  /**
   * The default path configuration. to use when mapping positional parameters
   * to named ones using configSetup from require('ezzy-config')
   * @returns {Array|undefined}
   */
  get pathConfig() {}

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
    // We should not override any bad status codes
    // that have been previously set by different requests.
    if (basics.response.statusCode !== 200 && status === 200) {
      return;
    }
    if (status !== 200) {
      logger.warn(
        basics,
        `StatusCode ${status}`,
        this._getRequestDetails(basics)
      );
    }
    try {
      basics.response.status(status);
    } catch (e) {
      logger.error(basics, "Status Code", e);
    }
  }

  /**
   * Logs the request details.
   * @returns {string}
   * @private
   */
  _getRequestDetails(basics) {
    const { hostname, originalUrl, method } = basics.request;
    const { remoteAddress } = basics.request.connection;
    return `${remoteAddress} -> ${method} -> //${hostname}${originalUrl}`;
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
    return this._sendErrorStatus(basics, headers, 400, "Bad Request");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  unauthorizedError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 401, "Unauthorized");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  paymentRequiredError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 402, "Payment Required");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  forbiddenError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 403, "Forbidden");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  notFoundError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 404, "Not Found");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  methodNotAllowedError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 405, "Method Not Allowed");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  notAcceptableError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 406, "Not Acceptable");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  proxyAuthenticationRequiredError(basics, headers) {
    return this._sendErrorStatus(
      basics,
      headers,
      407,
      "Proxy Authentication Required"
    );
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  requestTimeoutError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 408, "Request Time-out");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  conflictError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 409, "Conflict");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  goneError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 410, "Gone");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  lengthRequiredError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 411, "Length Required");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  preconditionFailedError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 412, "Precondition Failed");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  requestEntityTooLargeError(basics, headers) {
    return this._sendErrorStatus(
      basics,
      headers,
      413,
      "Request Entity Too Large"
    );
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  requesturiTooLargeError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 414, "Request-URI Too Large");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  unsupportedMediaTypeError(basics, headers) {
    return this._sendErrorStatus(
      basics,
      headers,
      415,
      "Unsupported Media Type"
    );
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  requestedRangeNotSatisfiableError(basics, headers) {
    return this._sendErrorStatus(
      basics,
      headers,
      416,
      "Requested Range Not Satisfiable"
    );
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  expectationFailedError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 417, "Expectation Failed");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  unprocessableEntityError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 422, "Unprocessable Entity");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  lockedError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 423, "Locked");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  failedDependencyError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 424, "Failed Dependency");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  unorderedCollectionError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 425, "Unordered Collection");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  upgradeRequiredError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 426, "Upgrade Required");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  preconditionRequiredError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 428, "Precondition Required");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  tooManyRequestsError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 429, "Too Many Requests");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  requestHeaderFieldsTooLargeError(basics, headers) {
    return this._sendErrorStatus(
      basics,
      headers,
      431,
      "Request Header Fields Too Large"
    );
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  internalServerError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 500, "Internal Server Error");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  notImplementedError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 501, "Not Implemented");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  badGatewayError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 502, "Bad Gateway");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  serviceUnavailableError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 503, "Service Unavailable");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  gatewayTimeoutError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 504, "Gateway Timeout");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  httpVersionNotSupportedError(basics, headers) {
    return this._sendErrorStatus(
      basics,
      headers,
      505,
      "HTTP Version Not Supported"
    );
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  variantAlsoNegotiatesError(basics, headers) {
    return this._sendErrorStatus(
      basics,
      headers,
      406,
      "Variant Also Negotiates"
    );
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  insufficientStorageError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 507, "Insufficient Storage");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  bandwidthLimitExceededError(basics, headers) {
    return this._sendErrorStatus(
      basics,
      headers,
      509,
      "Bandwidth Limit Exceeded"
    );
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  notExtendedError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 510, "Not Extended");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  networkAuthenticationRequiredError(basics, headers) {
    return this._sendErrorStatus(
      basics,
      headers,
      511,
      "Network Authentication Required"
    );
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  badDigestError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 400, "Bad Request");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  badMethodError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 405, "Method Not Allowed");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  internalError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 500, "Internal Server Error");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  invalidArgumentError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 409, "Conflict");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  invalidContentError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 400, "Bad Request");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  invalidCredentialsError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 401, "Unauthorized");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  invalidHeaderError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 400, "Bad Request");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  invalidVersionError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 400, "Bad Request");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  missingParameterError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 409, "Conflict");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  notAuthorizedError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 403, "Forbidden");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  requestExpiredError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 400, "Bad Request");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  requestThrottledError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 429, "Too Many Requests");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  resourceNotFoundError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 404, "Not Found");
  }

  /**
   * Sends an error response.
   * @param {HttpBasics} basics The http basics.
   * @param {object=} headers Additional headers to send.
   */
  wrongAcceptError(basics, headers) {
    return this._sendErrorStatus(basics, headers, 406, "Not Acceptable");
  }

  /**
   * Decorates the data as an API call.
   * @param {HttpBasics} basics The http basics.
   * @param {Object} headers Additional headers that will be appended.
   */
  decorateRequest(basics, headers = {}) {
    Object.assign(headers, { name, version, description });
    try {
      if (this.sendHeaders && !basics.response.headersSent) {
        basics.response.set(
          "x-version-requested",
          basics.request.params.version || "latest"
        );
        logger.debug("Request Headers Decoration", headers);
        for (let prop in headers) {
          if (headers.hasOwnProperty(prop)) {
            if (prop.toLowerCase() !== "access-control-allow-origin") {
              basics.response.set(`x-${prop}`, headers[prop]);
            } else {
              basics.response.set(prop, headers[prop]);
            }
          }
        }
      }
    } catch (e) {
      logger.error(basics, "Headers", this._getRequestDetails(basics));
      logger.error(basics, "Headers", e);
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
    this.sendStatus(basics, status);
    if (!this.sendHeaders) {
      return;
    }
    if (typeof headers === "string") {
      error = headers;
      headers = undefined;
    }
    if (headers) {
      Object.assign(headers, { status });
    }
    this.decorateRequest(basics, headers);
    const { accept } = basics.request.headers;
    if (this._errors && accept && /(text\/html|text\/plain)/i.test(accept)) {
      this._errors.then(errors => {
        let generatedContent;
        if (errors[status]) {
          generatedContent = errors[status]({ status });
        } else {
          generatedContent = errors.general(status);
        }
        basics.response.end(generatedContent);
      });
    } else {
      basics.response.json(
        typeof error === "string" ? { error, status } : error
      );
    }
  }
}

module.exports = Request;
