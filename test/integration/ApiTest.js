const ExpressMvc = require('../../src/ExpressMvc');
const request = require('testing/request');
const logger = require('logger').logger;
let app;
let origTimeout;

describe('Api', () => {

  beforeAll(() => {
    logger.silence();
    app = new ExpressMvc(__dirname + '/../../root');
    app.listen(9001);
    // origTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    // jasmine.DEFAULT_TIMEOUT_INTERVAL = 300000;
  });

  it('should bind the api properly', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/apis/express')
        .expect(200, {
          success: true
        })
        .expect('x-test', '1')
        .end(e => e ? fail(e) : done());
    });
  });

  it('should bind a second api properly', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/apis/secondExpress')
        .expect(200, {
          success: true
        })
        .end(e => e ? fail(e) : done());
    });
  });

  it('should obtain bad requests on methods not implemented (post)', done => {
    app.listener.then(listener => {
      request(listener)
        .post('/apis/express')
        .expect(501)
        .end(e => e ? fail(e) : done());
    });
  });

  it('should obtain bad requests on methods not implemented (patch)', done => {
    app.listener.then(listener => {
      request(listener)
        .patch('/apis/express')
        .expect(501)
        .end(e => e ? fail(e) : done());
    });
  });

  it('should obtain bad requests on methods not implemented (put)', done => {
    app.listener.then(listener => {
      request(listener)
        .patch('/apis/express')
        .expect(501)
        .end(e => e ? fail(e) : done());
    });
  });

  it('should forward parameters as query params', done => {
    app.listener.then(listener => {
      request(listener)
        .put('/apis/express/abc+def')
        .expect(200, {data: 'abc+def'})
        .end(e => e ? fail(e) : done());
    })
  });

  it('should have all the error methods implemented', done => {
    app.listener.then(listener => {
      Promise.all([
        ['badRequestError', 400],
        ['serverError', 401],
        ['unauthorizedError', 401],
        ['paymentRequiredError', 402],
        ['forbiddenError', 403],
        // ['notFoundError', 404],
        // ['methodNotAllowedError', 405],
        // ['notAcceptableError', 406],
        // ['proxyAuthenticationRequiredError', 407],
        // ['requestTimeoutError', 408],
        // ['conflictError', 409],
        // ['goneError', 410],
        // ['lengthRequiredError', 411],
        // ['preconditionFailedError', 412],
        // ['requestEntityTooLargeError', 413],
        // ['requesturiTooLargeError', 414],
        // ['unsupportedMediaTypeError', 415],
        // ['requestedRangeNotSatisfiableError', 416],
        // ['expectationFailedError', 417],
        // ['unprocessableEntityError', 422],
        // ['lockedError', 423],
        // ['failedDependencyError', 424],
        // ['unorderedCollectionError', 425],
        // ['upgradeRequiredError', 426],
        // ['preconditionRequiredError', 428],
        // ['tooManyRequestsError', 429],
        // ['requestHeaderFieldsTooLargeError', 431],
        // ['internalServerError', 500],
        // ['notImplementedError', 501],
        // ['badGatewayError', 502],
        // ['serviceUnavailableError', 503],
        // ['gatewayTimeoutError', 504],
        // ['httpVersionNotSupportedError', 505],
        // ['variantAlsoNegotiatesError', 406],
        // ['insufficientStorageError', 507],
        // ['bandwidthLimitExceededError', 509],
        // ['notExtendedError', 510],
        // ['networkAuthenticationRequiredError', 511],
        // ['badDigestError', 400],
        // ['badMethodError', 405],
        // ['internalError', 500],
        // ['invalidArgumentError', 409],
        // ['invalidContentError', 400],
        // ['invalidCredentialsError', 401],
        // ['invalidHeaderError', 400],
        // ['invalidVersionError', 400],
        // ['missingParameterError', 409],
        // ['notAuthorizedError', 403],
        // ['requestExpiredError', 400],
        // ['requestThrottledError', 429],
        // ['resourceNotFoundError', 404],
        // ['wrongAcceptError', 406]
      ].map(([endpoint, status]) => new Promise((resolve, reject) => {

        request(listener)
          .delete(`/apis/express/${endpoint}`)
          .expect(status)
          .end(e => e ? reject(e) : resolve());

      }))).then(() => done(), e => fail(e))
    });
  });

  afterAll(() => {
    app.close();
    logger.talk();
    // jasmine.DEFAULT_TIMEOUT_INTERVAL = origTimeout;
  });

});
