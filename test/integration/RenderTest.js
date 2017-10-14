const ExpressMvc = require('../../src/ExpressMvc');
const request = require('ezzy-testing/request');
const logger = require('ezzy-logger').logger;
let app;

describe('Render', () => {

  beforeAll(() => {
    logger.silence();
    app = new ExpressMvc(__dirname + '/../../root');
    app.listen(9001);
  });

  it('should invoke the get method properly', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/')
        .expect(/src=".*\/someDependency\.js"/)
        .expect(/src=".*\/anotherDependency\.js"/)
        .expect(/href=".*\/someDependency\.css"/)
        .expect(/href=".*\/anotherDependency\.css"/)
        .end(e => e ? fail(e) : done());
    });
  });

  it('should invoke the head method properly', done => {
    app.listener.then(listener => {
      request(listener)
        .head('/')
        .expect(200)
        .end(e => e ? fail(e) : done());
    });
  });

  afterAll(() => {
    app.close();
    logger.talk();
  });

});
