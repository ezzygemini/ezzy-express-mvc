const ExpressMvc = require('../../src/ExpressMvc');
const request = require('testing/request');
const logger = require('logger').logger;
let app;

describe('ExpressMvc', () => {

  beforeAll(() => {
    logger.silence();
    const expressMvc =
      new ExpressMvc(__dirname + '/../../root', /unknowndomain/);
    expressMvc.bindExpressMvc(new ExpressMvc(__dirname + '/../../root2'));
    app = expressMvc.listen(9002);
  });

  it('should not render anything when called from a different domain', done => {
    app.then(app => {
      request(app)
        .get('/apis/secondExpress')
        .expect(404)
        .end(e => e ? fail(e) : done());
    });
  });

  it('should render from an alternate express app', done => {
    app.then(app => {
      request(app)
        .get('/apis/express')
        .expect(200, {
          success: true,
          alternate: true
        })
        .end(e => e ? fail(e) : done());
    });
  });

  afterAll(() => {
    app.then(app => app.close());
    logger.talk();
  });

});
