const ExpressMvc = require('../../src/ExpressMvc');
let expressMvc;

describe('Express MVC', () => {

  beforeEach(() => {
    expressMvc = new ExpressMvc('./root');
  });

  it('should be able to traverse and find controllers', done => {

    expressMvc.controllers
      .then(controllers => expect(controllers.length).toBe(2))
      .then(() => expressMvc.apis)
      .then(apis => expect(apis.length).toBe(1))
      .then(done);

    expressMvc.getController('YourController')
      .then(yourController => {
        expect(yourController).toBeDefined();
        expect(yourController.hasView).toBe(false);
        expect(yourController.hasModel).toBe(false);
      });

    expressMvc.getController('MyController')
      .then(myController => {
        expect(myController).toBeDefined();
        expect(myController.hasView).toBe(true);
        expect(myController.hasModel).toBe(true);
      });

  });

});
