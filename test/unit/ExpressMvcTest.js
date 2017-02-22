const ExpressMvc = require('../../src/ExpressMvc');
let expressMvc;
const logger = require('logger').logger;

describe('Express MVC', () => {

  beforeAll(() => logger.silence());

  beforeEach(() => expressMvc = new ExpressMvc(__dirname + '/../../root'));

  it('should be able to traverse and find controllers', done => {

    expressMvc.controllers
      .then(controllers => expect(controllers.length).toBe(2))
      .then(() => expressMvc.apis)
      .then(apis => expect(apis.length).toBe(2))
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

  afterAll(() => logger.talk());

});
