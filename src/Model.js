class Model {

  /**
   * Obtains the data that will populate the model. Override this to use with
   * extensive promises.
   *
   * @param {HttpBasics} basics The HTTP basics.
   * @returns {Promise.<Model>}
   */
  getData(basics) {
    return Promise.resolve(this);
  }

}

module.exports = Model;
