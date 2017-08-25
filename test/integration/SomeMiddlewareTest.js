const ExpressMvc = require('../../src/ExpressMvc');
const request = require('ezzy-testing/request');
const logger = require('ezzy-logger').logger;
let app;

describe('SomeMiddleware', () => {

  beforeAll(() => {
    logger.silence();
    app = new ExpressMvc(__dirname + '/../../root', basics => {
      basics.request.client = 'some client';
      basics.next();
    });
    app.listen(9004);
  });

  it('should properly install middleware per method', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/apis/someMiddleware')
        .expect(200, {success: true})
        .end(done);
    });
  });

  it('should skip middleware properly', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/apis/someMiddleware?someTest')
        .expect(200, {success: false})
        .end(done);
    });
  });

  afterAll(() => {
    app.close();
    logger.talk();
  });

});
