const ExpressMvc = require('../../src/ExpressMvc');
const request = require('testing/request');
let app;
const logger = require('logger').logger;
let origTimeout;

describe('Api', () => {

  beforeAll(() => {
    origTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    const expressMvc = new ExpressMvc(__dirname + '/../root/');
    app = expressMvc.listen(3001);
  });

  it('should bind the api properly', done => {
    app.then(app => {
      request(app)
        .get('/apis/express')
        .expect(200, {
          success: true
        })
        .end(e => e ? fail(e) : done());
    });
  });

  it('should obtain bad requests on methods not implemented (patch)', done => {
    app.then(app => {
      request(app)
        .patch('/apis/express')
        .expect(501)
        .end(e => e ? fail(e) : done());
    });
  });

  it('should obtain bad requests on methods not implemented (put)', done => {
    app.then(app => {
      request(app)
        .put('/apis/express')
        .expect(501)
        .end(e => e ? fail(e) : done());
    });
  });

  afterAll(() => {
    app.then(app => app.close());
    jasmine.DEFAULT_TIMEOUT_INTERVAL = origTimeout;
  });

});
