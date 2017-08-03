const ExpressMvc = require('../../src/ExpressMvc');
const request = require('testing/request');
const logger = require('logger').logger;
let app;

describe('Middleware', () => {

  beforeAll(() => {
    // logger.silence();
    logger.level = 'debug';
    app = new ExpressMvc(__dirname + '/../../root', [
      basics => {
        basics.request.client = 'some client';
        basics.next();
      },
      basics => {
        if (basics.request.originalUrl.indexOf('/returnMwareResponse')) {
          basics.response.end('middleware bound');
        }
      }
    ], undefined, undefined, false);
    app.promise
      .then(() => app.bindExpressMvc(__dirname + '/../../root2')
        .then(() => app.listen(9002)));
  });

  it('setup', done => setTimeout(() => done(), 0));

  it('should bind proper middleware', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/')
        .expect(200, (e, body) => {
          if (e) {
            return fail(e);
          }
          expect(body.text).toContain('<b>some client</b>');
        })
        .end(e => e ? fail(e) : done());
    });
  });

  it('should bind middleware properly for multiple routes', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/apis/express/returnMwareResponse')
        .expect(200, 'middleware bound')
        .end(e => e ? fail(e) : done());
    });
  });

  afterAll(() => {
    app.close();
    logger.talk();
  });

});

