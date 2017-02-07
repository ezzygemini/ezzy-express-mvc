const ExpressMvc = require('../../src/ExpressMvc');
let expressMvc;

describe('Express MVC', () => {

  beforeEach(() => {
    expressMvc = new ExpressMvc(__dirname + '/../root/');
  });

  it('should be able to traverse and find controllers', done => {
    expressMvc.controllers
      .then(controllers => expect(controllers.length).toBe(2))
      .then(() => expressMvc.apis)
      .then(apis => expect(apis.length).toBe(0))
      .then(done);
  });

});