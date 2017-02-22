const ExpressMvc = require('../../src/ExpressMvc');
const request = require('testing/request');
const logger = require('logger').logger;
let app;

describe('Api', () => {

  beforeAll(() => {
    logger.silence();
    const expressMvc = new ExpressMvc(__dirname + '/../../root');
    app = expressMvc.listen(9001);
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

  it('should bind a second api properly', done => {
    app.then(app => {
      request(app)
        .get('/apis/secondExpress')
        .expect(200, {
          success: true
        })
        .end(e => e ? fail(e) : done());
    });
  });

  it('should obtain bad requests on methods not implemented (post)', done => {
    app.then(app => {
      request(app)
        .post('/apis/express')
        .expect(501)
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

  it('should obtain bad requests on methods not implemented (delete)', done => {
    app.then(app => {
      request(app)
        .delete('/apis/express')
        .expect(501)
        .end(e => e ? fail(e) : done());
    });
  });

  afterAll(() => {
    app.then(app => app.close());
    logger.talk();
  });

});
