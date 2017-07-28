const i18n = require('i18n-2');
const express = require('express');
const logger = require('logger').logger;
const recursive = require('recursive-fs');
const path = require('path');
const Api = require('./Api');
const Request = require('./Request');
const handlebars = require('./handlebars');
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
const {version} = require('./package');

class ExpressMvc {

  /**
   * @param {string=} directory The directory of the mvc sources.
   * @param {Function[]=} middleware Any middleware that's required.
   * @param {RegExp|Function=} domainReg The regular expression for the domain
   * or the function that will check if the route will be resolved.
   * @param {string[]|string=} statics The static routes to assign before
   * anything. Note: These routes are directories matching the context of the
   * folders within the application.
   * @param {boolean=} bind404 If we should bind a 404 route after all the
   * controllers are bound to avoid continuing to any other applications.
   * @param {express=} expressDep The express instance to be used.
   */
  constructor(directory, middleware, domainReg = /.*/,
              statics, bind404, expressDep) {

    // Bind the 404 route if we are auto checking for a different domain.
    if (bind404 === undefined) {
      bind404 = typeof domainReg !== 'function';
    }

    logger.debug({
      title: 'Express MVC',
      message: 'New MVC Application',
      data: {directory, domainReg, statics, bind404},
      borderTop: 3
    });

    /**
     * The express version we'll be using.
     * @type {*}
     * @private
     */
    const expr = expressDep || express;

    /**
     * The regular expression that will match the domain.
     * @type {RegExp}
     * @private
     */
    this._domainReg = domainReg;

    /**
     * The directory where we'll be looking for controllers and apis.
     */
    this._directory = path.normalize(directory);

    /**
     * The real express instance.
     */
    this._express = expr();

    /**
     * The handlebars instance to use for rendering.
     * @type {Promise.<Handlebars>}
     */
    this._hbs = handlebars(directory);

    /**
     * The express instance.
     */
    this.expressBasics = new ExpressBasics(this._express);

    /**
     * The listening object.
     * @type {*}
     * @private
     */
    this._listener = null;

    /**
     * Other MVC apps.
     * @type {Promise.<Array>}
     * @private
     */
    this._otherMvcApps = Promise.resolve([]);

    /**
     * Obtains all the js files.
     *
     * @type {Promise}
     */
    const allFiles = new Promise((resolve, reject) => {
      recursive.readdirr(this._directory, (e, dirs, files) => {
        if (e) {
          logger.error(e);
          return reject(e);
        }
        files = files.map(file => ({file, rank: file.split(/[\\/]/).length}))
          .sort((a, b) => b.rank - a.rank)
          .map(item => item.file);
        if (files) {
          logger.debug({title: 'All Files', message: files});
        }
        resolve({files, dirs});
      });
    });

    // Bind static paths
    this._staticRoutes = !statics ? Promise.resolve(true) : allFiles
      .then(({dirs}) => {

        statics = (Array.isArray(statics) ? statics : [statics])
          .map(route => path.normalize(this._directory + '/' + route + '/')
            .replace(/\/$/, ''));

        const staticFolders =
          dirs.filter(folder => statics.indexOf(folder) > -1);

        let context;
        staticFolders.forEach(folder => {
          context = '/' + path.relative(this._directory, folder);
          logger.debug('Static Route', `Binding ${folder} to ${context}`);
          this._express.use(context, expr.static(folder));
        });

        if (staticFolders.length !== statics.length) {
          logger.warn('Static Routes',
            `You defined ${statics.length} static routes, but we ` +
            `found ${staticFolders.length} folders.`);
          logger.warn('Static Routes', 'Routes', statics);
          logger.warn('Static Routes', 'Folders', dirs);
        }

      });

    // Bind any middleware that's required.
    this._middleware = !middleware ? Promise.resolve(true) : allFiles
      .then(() => {
        (typeof middleware === 'function' ? [middleware] : middleware)
          .forEach(handle => {
            logger.debug('Middleware', 'Binding middleware on ' + domainReg);
            this.expressBasics
              .use(basics => this._domainHandle(basics, handle));
          });
      });

    /**
     * The apis found in the directory.
     * @type {Promise.<Api[]>}
     * @private
     */
    this._apis = allFiles
      .then(({files}) => files.filter(file => /Api\.js$/.test(file))
        .map(file => {
          try {

            const apiKey = path.basename(file).replace(JS_EXT_REG, '');
            const SubApi = require(file.toString());
            const subApi = new SubApi();
            cache.getLibrary('apis').add(apiKey, subApi);
            this._bindApi(subApi, file);
            return subApi;

          } catch (e) {
            logger.error(e);
            logger.error(file.toString() + ' could not be bound as an Api');
            return null;
          }
        })
        .filter(ctrl => ctrl instanceof Api));

    /**
     * Node modules route.
     * @type {Promise.<void>}
     * @private
     */
    this._nodeModules = allFiles.then(() => {
      const context = this._getAbsPath(this._directory + '/node_modules') + '/';
      const staticApp = this._static(environment.nodeModules);
      this.expressBasics.use(['/:version' + context, context], basics =>
        this._domainHandle(basics, staticApp));
      logger.debug('Assets',
        'Node modules bound to route: ' + context +
        ' & /:version' + context +
        ' on directory ' + environment.nodeModules);
    });

    /**
     * The controllers found in the directory.
     * @type {Promise.<Controller[]>}
     * @private
     */
    this._controllers = allFiles
      .then(({files}) => files
        .filter(file => CONTROLLER_REG.test(file))
        .map(file => {
          file = file.toString();
          try {

            const matches = file.match(CONTROLLER_REG);
            const modelName = matches[3].toLowerCase() + matches[4] + 'Model';
            let viewFile =
              matches[2] + matches[3].toLowerCase() + matches[4] + 'View.hbs';

            let Model;
            try {
              const modelFile = matches[1] + 'Model.js';
              logger.debug('Model Lookup', `Looking for model ${modelFile}`);
              Model = require(modelFile);
            } catch (e) {
              logger.warn('No model found for controller ' + file);
              viewFile = null;
              Model = null;
            }

            const Ctrl = require(file);
            const ctrl = new Ctrl(viewFile, Model, modelName, this._hbs);
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

    /**
     * Route not found.
     * @type {Promise.<void>}
     * @private
     */
    this._notFound = !bind404 ? allFiles : allFiles.then(() => {
      this.expressBasics
        .use(basics => this
          ._domainHandle(basics, basics => Request.notFoundError(basics)));
      logger.debug('404', `Not found route on ${this._domainReg}`);
    });

  }

  /**
   * Binds a controller to the express application.
   * @param {Controller} controller The controller to bind.
   * @param {string=} file The file.
   * @private
   */
  _bindController(controller, file) {

    this._bindControllerAssets(file);

    const handler = basics =>
      this._domainHandle(basics, (basics) => cache.getLibrary('assets')
        .getOrElse(file, () => {
          return this._getAssets(file)
            .then(assets => {
              logger.debug('Assets', assets);
              return assets;
            });
        }, environment.development ? 100 : 0)
        .then((assets) => {
          basics.request.assets = assets;
          controller.doRequest(basics);
        }));

    const context = this._getAbsPath(path.dirname(file));

    let args = [];

    const pathVars =
      controller.path || '/:a?/:b?/:c?/:d?/:e?/:f?/:g?/:h?/:i?/:j?/:k?/:l?/:m?';

    if (context) {
      args.push([
        `${context}${pathVars}`,
        context
      ]);
      controller.context = context;
    }

    const middleware = controller.middleware;
    if (middleware) {
      if (Array.isArray(middleware)) {
        args = args.concat(middleware);
      } else {
        args.push(middleware);
      }
    }

    args.push(handler);

    this.expressBasics.use(...args);

    logger.debug('Controller', `Controller bound to express on route: ` +
      `'${context}' on domain ${this._domainReg}`);
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
          return [[], []];
        }

        logger.debug('Looking for assets in ' + assetsDir);

        return environment.development ?
          this._getDevelopmentAssets(assetsDir) :
          this._getProductionAssets(assetsDir);

      }).then(([css, js]) => this._getConfiguration(configFile)
        .then(cnf => {
          (cnf.dependencies || []).forEach(dependency => {
            if (CSS_REG.test(dependency)) {
              css.unshift(dependency);
            } else {
              js.unshift(dependency);
            }
          });
          logger.debug('Assets', {js, css});
          js = js.map(i => '/' + version + i);
          css = css.map(i => '/' + version + i);
          return {js, css};
        }));
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
            logger.debug('Controller Config', config);
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
              .filter(file => /\.js$/.test(file) && !/\.min\./.test(file))
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
            resolve(files.filter(file => /\.min\.js$/.test(file))
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
    const staticApp = this._static(dir);
    this.expressBasics.use(['/:version' + context, context], basics =>
      this._domainHandle(basics, staticApp));
    logger.debug('Assets', 'Static assets bound to route: ' +
      context + ' & /:version' + context + ' on directory ' + dir +
      ' on domain ' + this._domainReg);
  }

  /**
   * Generates a static app that turns the basics argument into the normal
   * request, response, next.
   * @param {string} dir The directory of the static assets.
   * @returns {Function}
   * @private
   */
  _static(dir) {
    const staticApp = express.static(dir);
    return basics => staticApp(basics.request, basics.response, basics.next);
  }

  /**
   * Binds compass on the static assets.
   * @param {string} dir The directory of the assets.
   * @private
   */
  _bindCompass(dir) {
    if (environment.development && !SKIP_COMPASS) {
      const context = this._getAbsPath(dir) + '/';
      this.expressBasics.use(['/:version' + context, context], basics =>
        this._domainHandle(basics, basics => {
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

        }));
      logger.debug('Compass', 'Compass compilation bound to route: ' +
        context + ' & ' + '/:version' + context +
        ' on domain ' + this._domainReg);
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

    const dirName = path.dirname(this._getAbsPath(file));

    let args = [];

    const context = dirName + (!dirName || dirName === '/' ? '' : '/') +
      path.basename(file)
        .replace(/^(.)(.*)Api\.js$/i, (a, b, c) => b.toLowerCase() + c);

    const pathVars =
      api.path || '/:a?/:b?/:c?/:d?/:e?/:f?/:g?/:h?/:i?/:j?/:k?/:l?/:m?';

    args.push([
      // using this method of passing parameters because
      // /:path* is not working properly
      `/:version${context}${pathVars}`,
      `/:version${context}`,
      `${context}${pathVars}`,
      context
    ]);
    api.context = context;

    const middleware = api.middleware;

    if (middleware) {
      if (Array.isArray(middleware)) {
        args = args.concat(middleware);
      } else {
        args.push(middleware);
      }
    }

    args.push(basics =>
      this._domainHandle(basics, basics => api.doRequest(basics)));

    this.expressBasics.use(...args);
    logger.debug({
      title: 'API',
      message: `Api bound to express on route: ${context} on ${this._domainReg}`
    });
  }

  /**
   * Performs the express activity if handled within domain.
   * @param {HttpBasics} basics The http basics.
   * @param {Function} handler The real handler.
   * @returns {*}
   * @private
   */
  _domainHandle(basics, handler) {
    let triggerRoute = true;
    const {hostname} = basics.request;
    if (typeof this._domainReg === 'function') {
      triggerRoute = this._domainReg(basics);
    } else {
      triggerRoute = this._domainReg.test(hostname);
    }
    return !triggerRoute ? basics.next() : handler(basics);
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
   * @returns {Promise.<ExpressMvc>}
   */
  listen(...args) {
    if (this._listener) {
      logger.error('Application already listening.');
      return Promise.resolve(this);
    }
    return this.promise.then(() => {
      this.expressBasics.use(basics => this
        ._domainHandle(basics, basics => Request.notFoundError(basics)));
      this._listener =
        this.expressBasics.listen.apply(this.expressBasics, args);
      logger.highlight('SERVER', `Listening on port ${args[0]}`);
      return this;
    }, e => {
      logger.error(e);
      return this;
    });
  }

  /**
   * Binds the i18n functionality to express.
   * @param options
   * @returns {ExpressMvc}
   */
  bindI18n(options) {
    i18n.expressBind(this._express, Object.assign({
      locales: ['en']
    }, options));
    this.expressBasics.use((basics) => {
      basics.request.i18n.setLocaleFromCookie(basics.request);
      basics.next();
    });
    return this;
  }

  /**
   * Obtains the listener.
   * @returns {Promise.<express>}
   */
  get listener() {
    return new Promise((resolve, reject) => {
      if (this._listener) {
        return resolve(this._listener);
      }
      setTimeout(() => resolve(this.listener), 10);
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
   * Applies a static route to the express application.
   * @param {string|string[]} route The route of this static app.
   * @param {string} dir The directory to bound as static.
   * @returns {*}
   */
  static(route, dir) {
    logger.debug('Static', `Binding static app on ${dir}`);
    return this._express.use(route, express.static(dir));
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

  /**
   * Returns the promises made by the controllers and apis.
   * @returns {Promise.<ExpressMvc>}
   */
  get promise() {
    return Promise.all([
      this._staticRoutes,
      this._middleware,
      this._controllers,
      this._apis,
      this._nodeModules,
      this._notFound
    ]).then(() => this);
  }

  /**
   * Binds another express MVC application.
   * @param {string} dir The directory to use.
   * @param {Function[]=} middleware The middleware to bind.
   * @param {RegExp|Function=} reg The regular expression to check on the domain
   * or the function that will check if we need to parse the handler.
   * @param {express=} exp The express version to use.
   * @returns {Promise.<ExpressMvc>}
   */
  bindExpressMvc(dir, middleware, reg, exp) {
    return this.promise.then(() => new ExpressMvc(dir, middleware, reg, exp)
      .promise.then(app => this.express.use(app.express)));
  }

  /**
   * Closes the connection if it's active.
   * @returns {ExpressMvc}
   */
  close() {
    if (!this._listener) {
      return logger.warn('Application is not listening to any ports.');
    }
    this._listener.close();
    this._listener = null;
    return this;
  }

}

module.exports = ExpressMvc;
