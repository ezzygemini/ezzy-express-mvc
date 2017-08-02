const Controller = require('../src/Controller');

class MyController extends Controller {

  doGet(basics) {
    switch (basics.request.query.getError) {
      case 'not-found':
        return this.notFoundError(basics);
      case 'server-error':
        return this.internalServerError(basics);
      case 'unauthorized':
        return this.unauthorizedError(basics);
    }
    return super.doGet(basics);
  }

}

module.exports = MyController;
