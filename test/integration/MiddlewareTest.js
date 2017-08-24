const ExpressMvc = require('../../src/ExpressMvc');
const request = require('testing/request');
const logger = require('logger').logger;
let app;

describe('Middleware', () => {

  beforeAll(() => {
    logger.silence();
    // logger.level = 'debug';
    app = new ExpressMvc(__dirname + '/../../root', basics => {
      basics.request.client = 'some client';
      basics.next();
    }, undefined, undefined, false, undefined, basics => {
      if (/returnMwareResponse/.test(basics.request.originalUrl)) {
        return basics.response.status(200).send('middleware bound');
      }
      basics.next();
    });
    app.promise
      .then(() => app.bindExpressMvc(__dirname + '/../../root2')
        .then(() => app.listen(9003)));
  });

  it('setup', done => setTimeout(() => done(), 0));

  it('should bind proper middleware', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/apis/express/someClient')
        .expect(200, /.*<b>some client<\/b>.*/, done);
    });
  });

  it('should bind middleware properly for multiple routes', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/apis/express/returnMwareResponse')
        .expect(200, /.*middleware bound.*/, done);
    });
  });

  afterAll(() => {
    app.close();
    logger.talk();
  });

});

