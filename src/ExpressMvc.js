const express = require('express');
const logger = require('logger').logger;
const recursive = require('recursive-fs');
const path = require('path');
const Api = require('./Api');
const Controller = require('./Controller');
const CONTROLLER_REG = /^((.*\/)(.)(.*))(Ctrl|Controller)(\.js)$/i;
const JS_EXT_REG = /\.js$/i;
const cache = require('./cache');
const ExpressBasics = require('express-basics');
const environment = require('environment');

class ExpressMvc {

  /**
   * @param {string=} directory The directory of the mvc sources.
   * @param {express=} expressVersion The express instance to be used.
   */
  constructor (directory, expressVersion) {

    /**
     * The express version we'll be using.
     * @type {*}
     * @private
     */
    const expr = expressVersion || express;

    /**
     * The directory where we'll be looking for controllers and apis.
     */
    this._directory = path.normalize(directory) || process.cwd();

    /**
     * The express instance.
     */
    this.expressBasics = new ExpressBasics(expr());

    /**
     * Obtains all the js files.
     *
     * @type {Promise}
     */
    const allJsFiles = new Promise((resolve, reject) => {
      recursive.readdirr(this._directory, (e, dirs, files) => {
        if (e) {
          logger.error(e);
          return reject(e);
        }
        logger.debug(files);
        resolve(files);
      });
    });

    /**
     * The apis found in the directory.
     * @type {Promise.<Api[]>}
     * @private
     */
    this._apis = allJsFiles
      .then(files => files.filter(file => /Api\.js$/.test(file))
        .map(file => {
          try {

            const apiKey = path.basename(file).replace(JS_EXT_REG, '');
            const SubApi = require(file.toString());
            const subApi = new SubApi();
            cache.getLibrary('apis').add(apiKey, subApi);
            this._bindApi(subApi, file);
            return subApi;

          } catch (e) {
            logger.error(file.toString() + ' is not an Api');
            return null;
          }
        })
        .filter(ctrl => ctrl instanceof Api));

    /**
     * The controllers found in the directory.
     * @type {Promise.<Controller[]>}
     * @private
     */
    this._controllers = allJsFiles
      .then(files => files
        .filter(file => CONTROLLER_REG.test(file))
        .map(file => {
          file = file.toString();
          try {

            let viewFile =
              file.replace(CONTROLLER_REG, (a, b) => `${b}View.hbs`);

            let Model;
            try {
              const modelFile =
                file.replace(CONTROLLER_REG, (a, b) => `${b}Model.js`);
              logger.debug('Looking for model ' + modelFile);
              Model = require(modelFile);
            } catch (e) {
              logger.warn('No model found for controller ' + file);
              viewFile = null;
              Model = null;
            }

            const Ctrl = require(file);
            const ctrl = new Ctrl(viewFile, Model);
            const ctrlKey = path.basename(file).replace(JS_EXT_REG, '');

            cache.getLibrary('controllers').add(ctrlKey, ctrl);

            this._bindController(ctrl, file);

            return ctrl;

          } catch (e) {
            logger.error(e);
            return null;
          }
        })
        .filter(ctrl => ctrl instanceof Controller));

  }

  /**
   * Obtains the context based on the file path.
   * @param {string} file The destination.
   * @returns {string}
   * @private
   */
  _getRelativeContext (file) {
    let context = path.relative(this._directory, path.dirname(file));
    if (context) {
      return '/' + context.replace(/\\/g, '/');
    }
  }

  /**
   * Binds a controller to the express application.
   * @param {Controller} controller The controller to bind.
   * @param {string=} file The file.
   * @private
   */
  _bindController (controller, file) {
    const context = this._getRelativeContext(file);

    this._bindControllerAssets(context, file);

    const handler = basics => {

      cache.getLibrary('assets')
        .getOrElse(file, () => new Promise(resolve => {

          const assetsDir = ExpressMvc._getAssetDirectoryName(file);
          logger.debug('Looking for assets in ' + assetsDir);
          recursive.readdirr(assetsDir,
            (e, dirs, files) => {
              if (e) {
                logger.error(e);
                return resolve({css: [], js: []});
              }
              logger.debug({
                title: 'Assets',
                message: files
              });
              resolve({
                css: files.filter(file => /\.css$/i.test(file)),
                js: files.filter(file => /\.js$/i.test(file))
              });
            });

        }), environment.development ? 100 : 0)
        .then(assets => {
          controller.requestHandler(Object.assign(basics, {assets}));
        });
    };

    if (context) {
      this.expressBasics.use('/' + context, handler);
    } else {
      this.expressBasics.use(handler);
    }

    logger.debug('Controller bound to express on route: ' + (context || '/'));
  }

  /**
   * Binds the assets to the controller.
   * @param {string=} context The context where the assets will be.
   * @param {string=} file The file.
   * @private
   */
  _bindControllerAssets (context, file) {
    const dir = ExpressMvc._getAssetDirectoryName(file);
    context = (context || '/') + path.basename(dir);
    this.express.use(['/:version' + context, context], express.static(dir));
    logger.debug('Static assets bound to route: ' +
      context + ' & /:version' + context);
  }

  /**
   * Obtains the name of the assets directory based on a file path.
   * @param {string} file The file name.
   * @returns {string}
   * @private
   */
  static _getAssetDirectoryName (file) {
    const matches = file.match(CONTROLLER_REG);
    return matches[2] + matches[3].toLowerCase() + matches[4] + 'Assets';
  }

  /**
   * Binds an api to the express application.
   * @param {Api} api The controller to bind.
   * @param {string=} file The file.
   * @private
   */
  _bindApi (api, file) {
    const context = this._getRelativeContext(file) + '/' + path.basename(file)
        .replace(/^(.)(.*)Api\.js$/i, (a, b, c) => b.toLowerCase() + c);
    this.expressBasics.use(context, basics => api.requestHandler(basics));
    logger.debug('Api bound to express on route: ' + (context || '/'));
  }

  /**
   * Obtains the list of apis.
   * @returns {Promise.<Api[]>}
   */
  get apis () {
    return this._apis;
  }

  /**
   * Obtains the list of controllers.
   * @returns {Promise.<Controller[]>}
   */
  get controllers () {
    return this._controllers;
  }

  /**
   * Gets the controller.
   * @param {String} name The name of the controller.
   * @returns {Promise.<Controller>}}
   */
  getController (name) {
    return this._controllers
      .then(() => cache.getLibrary('controllers').get(name));
  }

  /**
   * Gets the api.
   * @param {String} name The name of the api.
   * @returns {Promise.<Api>}}
   */
  getApi (name) {
    return this._apis
      .then(() => cache.getLibrary('apis').get(name));
  }

  /**
   * Forwards the request to the listen method.
   * @param {*} args The arguments to send.
   * @returns {Promise.<express>}
   */
  listen (...args) {
    return Promise.all([this._controllers, this._apis])
      .then(() => {
        this.expressBasics.use((req, res) => res.status(404).end());
        this.expressBasics.listen.apply(this.expressBasics, args);
        logger.highlight({
          title: 'SERVER',
          message: `Listening on port ${args[0]}`
        });
        return this.express;
      }, e => {
        logger.error(e);
        return this.express;
      });
  }

  /**
   * Simple getter of the express instance.
   * @returns {express}
   */
  get express () {
    return this.expressBasics.express;
  }

  /**
   * Forwards the request to the use method.
   * @param {*} args The arguments to send.
   * @returns {express}
   */
  use (...args) {
    return this.expressBasics.use.apply(this.expressBasics, args);
  }

  /**
   * Forwards the request to the get method.
   * @param {*} args The arguments to send.
   * @returns {express}
   */
  get (...args) {
    return this.expressBasics.get.apply(this.expressBasics, args);
  }

  /**
   * Forwards the request to the put method.
   * @param {*} args The arguments to send.
   * @returns {express}
   */
  put (...args) {
    return this.expressBasics.put.apply(this.expressBasics, args);
  }

  /**
   * Forwards the request to the post method.
   * @param {*} args The arguments to send.
   * @returns {express}
   */
  post (...args) {
    return this.expressBasics.post.apply(this.expressBasics, args);
  }

  /**
   * Forwards the request to the patch method.
   * @param {*} args The arguments to send.
   * @returns {express}
   */
  patch (...args) {
    return this.expressBasics.patch.apply(this.expressBasics, args);
  }

  /**
   * Forwards the request to the delete method.
   * @param {*} args The arguments to send.
   * @returns {express}
   */
  delete (...args) {
    return this.expressBasics.delete.apply(this.expressBasics, args);
  }

}

module.exports = ExpressMvc;
