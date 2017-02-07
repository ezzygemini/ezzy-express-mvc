const Model = require('../../src/Model');

class MyModel extends Model {

  get data() {
    return Promise.resolve({
      title: 'Hello World'
    });
  }

}

module.exports = MyModel;
