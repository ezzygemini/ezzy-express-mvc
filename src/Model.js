const {version} = require('./package');

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

  /**
   * Versions an asset with the application version number.
   * @param {string} assetPathFromRoot The asset from the root of the site.
   * @returns {*}
   */
  versionAsset(assetPathFromRoot) {
    if (!/^\//.test(assetPathFromRoot)) {
      return assetPathFromRoot;
    }
    return `/${version}${assetPathFromRoot}`;
  }

}

module.exports = Model;
