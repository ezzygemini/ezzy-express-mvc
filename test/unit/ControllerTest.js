const ExpressMvc = require('../../src/ExpressMvc');
let expressMvc;

describe('Controller', () => {

  beforeEach(() => expressMvc = new ExpressMvc('./root'));

  it('should render a handlebars template properly', done => {
    expressMvc.getController('MyController')
      .then(controller => {
        controller.render().then(data => {
          expect(data).toContain('<h1>Hello World</h1>');
          done();
        });
      });
  });

});
