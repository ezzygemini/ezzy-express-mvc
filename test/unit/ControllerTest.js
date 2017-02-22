const ExpressMvc = require('../../src/ExpressMvc');
let expressMvc;
const logger = require('logger').logger;

describe('Controller', () => {

  beforeAll(() => logger.silence());

  beforeEach(() => expressMvc = new ExpressMvc(__dirname + '/../../root'));

  it('should render a handlebars template properly', done => {
    expressMvc.getController('MyController')
      .then(controller => {
        controller.render().then(data => {
          expect(data).toContain('<h1>Hello World</h1>');
          done();
        });
      });
  });

  afterAll(() => logger.talk());

});
