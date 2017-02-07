class Model {

  /**
   * Obtains the data that will populate the model. Override this to use with
   * extensive promises.
   * @returns {Promise.<Model>}
   */
  get data() {
    return Promise.resolve(this);
  }

}

module.exports = Model;
