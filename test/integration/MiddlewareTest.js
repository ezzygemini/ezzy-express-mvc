const ExpressMvc = require('../../src/ExpressMvc');
const request = require('testing/request');
const logger = require('logger').logger;
let app;

describe('Middleware', () => {

  beforeAll(() => {
    logger.silence();
    app = new ExpressMvc(__dirname + '/../../root', basics => {
      basics.request.client = 'some client';
      logger.highlight(basics);
      basics.next();
    });
    app.listen(9002);
  });

  it('should bind proper middleware', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/')
        .expect(200, (e, body) => {
          if (e) {
            return fail(e);
          }
          expect(body.text).toContain('<b>some client</b>');
          done();
        });
    });
  });

  afterAll(() => {
    app.close();
    logger.talk();
  });

});
