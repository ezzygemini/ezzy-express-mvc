const ExpressMvc = require('../../src/ExpressMvc');
const request = require('testing/request');
const logger = require('logger').logger;
let app;

describe('ExpressMvc', () => {

  beforeAll(() => {
    logger.silence();
    app = new ExpressMvc(__dirname + '/../../root', null,
      /unknowndomain/, __dirname + '/../../root/assets/');
    app.bindExpressMvc(__dirname + '/../../root2');
    app.listen(9002);
  });

  it('should have bound static assets before the application', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/someDir/test.json')
        .expect(200, {
          hello: "world"
        })
        .end(e => e ? fail(e) : done());
    });
  });

  it('should not render anything when called from a different domain', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/apis/secondExpress')
        .expect(404)
        .end(e => e ? fail(e) : done());
    });
  });

  it('should render from an alternate express app', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/apis/express')
        .expect(200, {
          success: true,
          alternate: true
        })
        .end(e => e ? fail(e) : done());
    });
  });

  afterAll(() => {
    app.close();
    logger.talk();
  });

});
