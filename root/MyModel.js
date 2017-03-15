const Model = require('../src/Model');

class MyModel extends Model {

  data(basics) {
    return Promise.resolve({
      title: 'Hello World',
      client: ((basics || {}).request || {}).client
    });
  }

}

module.exports = MyModel;
