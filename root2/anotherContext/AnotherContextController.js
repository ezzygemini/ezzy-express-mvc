const Controller = require('../../src/Controller');

class AnotherContextController extends Controller {

  doGet(basics) {
    if(basics.request.query.getError){
      basics.request.headers.accept = 'text/html';
      switch (basics.request.query.getError) {
        case 'not-found':
          return this.notFoundError(basics);
        case 'server-error':
          return this.internalServerError(basics);
        case 'wrong-accept':
          return this.wrongAcceptError(basics);
      }
    }
    return super.doGet(basics);
  }

}

module.exports = AnotherContextController;
