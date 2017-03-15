const ExpressMvc = require('../../src/ExpressMvc');
const request = require('testing/request');
const logger = require('logger').logger;
let app;

describe('Api', () => {

  beforeAll(() => {
    logger.silence();
    app = new ExpressMvc(__dirname + '/../../root');
    app.listen(9001);
  });

  it('should bind the api properly', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/apis/express')
        .expect(200, {
          success: true
        })
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
        .put('/apis/express')
        .expect(501)
        .end(e => e ? fail(e) : done());
    });
  });

  it('should obtain bad requests on methods not implemented (delete)', done => {
    app.listener.then(listener => {
      request(listener)
        .delete('/apis/express')
        .expect(501)
        .end(e => e ? fail(e) : done());
    });
  });

  afterAll(() => {
    app.close();
    logger.talk();
  });

});
