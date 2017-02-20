const express = require('express');
const logger = require('logger').logger;
const recursive = require('recursive-fs');
const path = require('path');
const Api = require('./Api');
const Controller = require('./Controller');
const CONTROLLER_REG = /^((.*[\/\\])(.)(.*))(Ctrl|Controller)(\.js)$/i;
const JS_EXT_REG = /\.js$/i;
const cache = require('./cache');
const ExpressBasics = require('express-basics');
const environment = require('environment');
const exec = require('child_process').exec;
const SKIP_COMPASS = environment.argument('SKIP_COMPASS', false);
const COMPASS = environment.argument('COMPASS', 'compass');
const COMPASS_CMD = COMPASS +
  ' compile --relative-assets --output-style=expanded ' +
  '--css-dir=css --sass-dir=scss --images-dir=images --trace';
const CSS_REG = /\.css(\?.*)?$/;
const fs = require('fs-plus');

class ExpressMvc {

  /**
   * @param {string=} directory The directory of the mvc sources.
   * @param {express=} expressVersion The express instance to be used.
   */
  constructor(directory, expressVersion) {

    /**
     * The express version we'll be using.
     * @type {*}
     * @private
     */
    const expr = expressVersion || express;

    /**
     * The directory where we'll be looking for controllers and apis.
     */
    this._directory = path.normalize(directory);

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

            const matches = file.match(CONTROLLER_REG);
            const modelName = matches[3].toLowerCase() + matches[4] + 'Model';
            let viewFile = matches[1] + 'View.hbs';

            let Model;
            try {
              const modelFile = matches[1] + 'Model.js';
              logger.debug('Looking for model ' + modelFile);
              Model = require(modelFile);
            } catch (e) {
              logger.warn('No model found for controller ' + file);
              viewFile = null;
              Model = null;
            }

            const Ctrl = require(file);
            const ctrl = new Ctrl(viewFile, Model, modelName);
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

    // Bind the node modules.
    this._bindNodeModules(this._directory);

  }

  /**
   * Binds a controller to the express application.
   * @param {Controller} controller The controller to bind.
   * @param {string=} file The file.
   * @private
   */
  _bindController(controller, file) {

    this._bindControllerAssets(file);

    const handler = basics => cache.getLibrary('assets')
      .getOrElse(file, () => {
        return this._getAssets(file)
          .then(assets => {
            logger.debug({title: 'Assets', message: assets});
            return assets;
          });
      }, environment.development ? 100 : 0)
      .then(assets => {
        controller.doRequest(Object.assign(basics, {assets}));
      });

    const context = this._getAbsPath(path.dirname(file));

    if (context) {
      this.expressBasics.use('/' + context, handler);
    } else {
      this.expressBasics.use(handler);
    }

    logger.debug(`Controller bound to express on route: '${context}'`);
  }

  /**
   * Obtains the assets dynamically.
   * @param {string} file The file to obtain assets from.
   * @returns {Promise.<Array[]>}
   * @private
   */
  _getAssets(file) {
    const {assetsDir, configFile} = this._getControllerAssetNames(file);

    return fs.existsPromise(assetsDir)
      .then(exists => {

        if (!exists) {
          logger.warn(`No assets found ${assetsDir}`);
          return {js: [], css: []};
        }

        logger.debug('Looking for assets in ' + assetsDir);

        let promise = environment.development ?
          this._getDevelopmentAssets(assetsDir) :
          this._getProductionAssets(assetsDir);

        return promise.then(([css, js]) => this._getConfiguration(configFile)
          .then(cnf => {
            (cnf.dependencies || []).forEach(dependency => {
              if (CSS_REG.test(dependency)) {
                css.unshift(dependency);
              } else {
                js.unshift(dependency);
              }
            });
            logger.debug({title: 'Assets', message: {js, css}});
            return {js, css};
          }));

      });
  }

  /**
   * Obtains the configuration.
   * @param configFile
   * @returns {Promise.<Object>}
   * @private
   */
  _getConfiguration(configFile) {
    return cache.getLibrary('configurations')
      .getOrElse(configFile, () => fs.readFilePromise(configFile)
        .then(
          config => {
            config = JSON.parse(config.toString());
            if (config[environment.name]) {
              Object.assign(config, config[environment.name]);
              delete config[environment.name];
            }
            logger.debug({title: 'Controller Config', message: config});
            return config;
          },
          e => {
            logger.warn(e);
            return {};
          }
        ), environment.development ? 100 : 0);
  }

  /**
   * Obtains the development assets.
   * @param {string} assetsDir The assets directory.
   * @returns {Promise.<Array[]>}
   * @private
   */
  _getDevelopmentAssets(assetsDir) {
    return Promise.all([
      new Promise(resolve => {
        recursive.readdirr(path.normalize(assetsDir + '/scss/'),
          (e, dirs, files) => {
            if (e) {
              logger.error(e);
              return resolve([]);
            }
            resolve(files.filter(file =>
            /\.scss/.test(file) && !/[\/\\]_.*/.test(file))
              .map(file => this._getAbsPath(file)
                .replace(/scss/g, 'css')));
          });
      }),
      new Promise(resolve => {
        recursive.readdirr(path.normalize(assetsDir + '/js/'),
          (e, dirs, files) => {
            if (e) {
              logger.error(e);
              return resolve([]);
            }
            resolve(files
              .filter(file => /\.js/.test(file) && !/\.min\./.test(file))
              .map(file => this._getAbsPath(file)));
          });
      })
    ]);
  }

  /**
   * Obtains the production assets.
   * @param {string} assetsDir The assets directory.
   * @returns {Promise.<Array[]>}
   * @private
   */
  _getProductionAssets(assetsDir) {
    return Promise.all([
      new Promise(resolve => {
        recursive.readdirr(path.normalize(assetsDir + '/css/'),
          (e, dirs, files) => {
            if (e) {
              logger.error(e);
              return resolve([]);
            }
            resolve(files.filter(file => /\.min\.css$/.test(file))
              .map(file => '/' + path.relative(this._directory, file)
                .replace(/\\/g, '/')));
          });
      }),
      new Promise(resolve => {
        recursive.readdirr(path.normalize(assetsDir + '/js/'),
          (e, dirs, files) => {
            if (e) {
              logger.error(e);
              return resolve([]);
            }
            resolve(files.filter(file => /\.min\.js/.test(file))
              .map(file => '/' + path.relative(this._directory, file)
                .replace(/\\/g, '/')));
          });
      })
    ]);
  }

  /**
   * Binds the assets to the controller.
   * @param {string} file The file.
   * @private
   */
  _bindControllerAssets(file) {
    const {assetsDir} = this._getControllerAssetNames(file);
    this._bindCompass(assetsDir);
    this._bindStaticAssets(assetsDir);
  }

  /**
   * Binds the static assets to the application.
   * @param {string} dir The directory of the assets.
   * @private
   */
  _bindStaticAssets(dir) {
    const context = this._getAbsPath(dir) + '/';
    this.express
      .use(['/:version' + context, context], express.static(dir));
    logger.debug('Static assets bound to route: ' +
      context + ' & /:version' + context + ' on directory ' + dir);
  }

  /**
   * Binds the node modules as a static resource.
   * @private
   */
  _bindNodeModules(dir) {
    const context = this._getAbsPath(dir + '/node_modules') + '/';
    this.express.use(['/:version' + context, context],
      express.static(environment.nodeModules));
    logger.debug('Node modules bound to route: ' + context +
      ' & /:version' + context +
      ' on directory ' + environment.nodeModules);
  }

  /**
   * Binds compass on the static assets.
   * @param {string} dir The directory of the assets.
   * @private
   */
  _bindCompass(dir) {
    const context = this._getAbsPath(dir) + '/';
    if (environment.development && !SKIP_COMPASS) {
      this.expressBasics.use(['/:version' + context, context], basics => {
        if (!CSS_REG.test(basics.request.originalUrl)) {
          return basics.next();
        }
        exec(COMPASS_CMD, {cwd: dir}, (e, output) => {
          if (e) {
            logger.error({title: 'Compass', message: e});
          } else if (output) {
            logger.debug({title: 'Compass', message: output});
          }
          basics.next();
        });

      });
      logger.debug('Compass compilation bound to route: ' +
        context + ' & ' + '/:version' + context);
    }
  }

  /**
   * Obtains the name of the assets directory based on a file path.
   * @param {string} file The file name.
   * @returns {{assetsDir:string,configFile:string,rootDir:string}}
   * @private
   */
  _getControllerAssetNames(file) {
    const matches = file.match(CONTROLLER_REG);
    const prefix = matches[2] + matches[3].toLowerCase() + matches[4];
    return {
      rootDir: matches[2],
      assetsDir: prefix + 'Assets',
      configFile: prefix + 'Config.json'
    };
  }

  /**
   * Gets a relative path to a destination based on controller directory.
   * @param {string} destination The destination.
   * @returns {string}
   * @private
   */
  _getAbsPath(destination) {
    return '/' +
      path.relative(this._directory, path.normalize(destination))
        .replace(/\\/g, '/');
  }

  /**
   * Binds an api to the express application.
   * @param {Api} api The controller to bind.
   * @param {string=} file The file.
   * @private
   */
  _bindApi(api, file) {
    const context = path.dirname(this._getAbsPath(file)) + '/' +
      path.basename(file)
        .replace(/^(.)(.*)Api\.js$/i, (a, b, c) => b.toLowerCase() + c);
    this.expressBasics.use(context, basics => api.doRequest(basics));
    logger.debug(`Api bound to express on route: ${context}`);
  }

  /**
   * Obtains the list of apis.
   * @returns {Promise.<Api[]>}
   */
  get apis() {
    return this._apis;
  }

  /**
   * Obtains the list of controllers.
   * @returns {Promise.<Controller[]>}
   */
  get controllers() {
    return this._controllers;
  }

  /**
   * Gets the controller.
   * @param {String} name The name of the controller.
   * @returns {Promise.<Controller>}}
   */
  getController(name) {
    return this._controllers
      .then(() => cache.getLibrary('controllers').get(name));
  }

  /**
   * Gets the api.
   * @param {String} name The name of the api.
   * @returns {Promise.<Api>}}
   */
  getApi(name) {
    return this._apis.then(() => cache.getLibrary('apis').get(name));
  }

  /**
   * Forwards the request to the listen method.
   * @param {*} args The arguments to send.
   * @returns {Promise.<express>}
   */
  listen(...args) {
    return Promise.all([this._controllers, this._apis])
      .then(() => {
        this.expressBasics.use(basics => basics.response.status(404).end());
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
  get express() {
    return this.expressBasics.express;
  }

  /**
   * Forwards the request to the use method.
   * @param {*} args The arguments to send.
   * @returns {express}
   */
  use(...args) {
    return this.expressBasics.use.apply(this.expressBasics, args);
  }

  /**
   * Forwards the request to the get method.
   * @param {*} args The arguments to send.
   * @returns {express}
   */
  get(...args) {
    return this.expressBasics.get.apply(this.expressBasics, args);
  }

  /**
   * Forwards the request to the put method.
   * @param {*} args The arguments to send.
   * @returns {express}
   */
  put(...args) {
    return this.expressBasics.put.apply(this.expressBasics, args);
  }

  /**
   * Forwards the request to the post method.
   * @param {*} args The arguments to send.
   * @returns {express}
   */
  post(...args) {
    return this.expressBasics.post.apply(this.expressBasics, args);
  }

  /**
   * Forwards the request to the patch method.
   * @param {*} args The arguments to send.
   * @returns {express}
   */
  patch(...args) {
    return this.expressBasics.patch.apply(this.expressBasics, args);
  }

  /**
   * Forwards the request to the delete method.
   * @param {*} args The arguments to send.
   * @returns {express}
   */
  delete(...args) {
    return this.expressBasics.delete.apply(this.expressBasics, args);
  }

}

module
  .exports = ExpressMvc;
