const {version} = require('../../src/package');
const Model = require('../../src/Model');
let model;

describe('Model', () => {

  beforeAll(() => {
    model = new Model();
  });

  it('should return the model', done => {
    model.getData()
      .then(model => expect(model instanceof Model).toBe(true))
      .then(done);
  });

  it('should version the assets properly', done => {
    expect(model.versionAsset('/someAsset.jpg')).toContain(version);
    done();
  });

});