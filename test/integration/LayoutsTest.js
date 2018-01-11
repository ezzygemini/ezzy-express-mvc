const ExpressMvc = require('../../src/ExpressMvc');
const request = require('ezzy-testing/request');
const logger = require('ezzy-logger').logger;
let app;

describe('Layouts', () => {

  beforeAll(() => {
    logger.silence();
    app = new ExpressMvc(__dirname + '/../../root');
    app.listen(9005);
  });

  it('should render layouts into content variable', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/contextA')
        .expect(200)
        .expect(/<title>Default Layout<\/title>/i)
        .expect(/context A/i)
        .end(e => e ? fail(e) : done());
    });
  });

  it('should render extended layouts', done => {
    app.listener.then(listener => {
      request(listener)
        .get('/contextB')
        .expect(200)
        .expect(/<title>Default Layout<\/title>/i)
        .expect(/<h1>Extended Headline<\/h1>/i)
        .expect(/context B/i)
        .end(e => e ? fail(e) : done());
    });
  });

  afterAll(() => {
    app.close();
    logger.talk();
  });

});
