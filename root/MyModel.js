const Model = require('../src/Model');

class MyModel extends Model {

  data() {
    return Promise.resolve({
      title: 'Hello World'
    });
  }

}

module.exports = MyModel;
