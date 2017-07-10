const Api = require('../../src/Api');

class SomeMiddlewareApi extends Api {

  get middleware() {
    return (req, res, next) => {
      if (req.originalUrl.indexOf('?') > -1) {
        return res.send({success: false});
      }
      return next();
    }
  }

  doGet(basics) {
    return this.sendData(basics, {success: true});
  }

}

module.exports = SomeMiddlewareApi;
