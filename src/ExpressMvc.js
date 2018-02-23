const i18n = require('i18n-2');
const express = require('express');
const logger = require('ezzy-logger').logger;
const recursive = require('recursive-fs');
const path = require('path');
const Api = require('./Api');
const Request = require('./Request');
const handlebarsCore = require('handlebars');
const Controller = require('./Controller');
const CONTROLLER_REG = /^((.*[\/\\])(.)(.*))(Ctrl|Controller)(\.js)$/i;
const JS_EXT_REG = /\.js$/i;
const cache = require('./cache');
const ExpressBasics = require('ezzy-express-basics');
const environment = require('ezzy-environment');
const exec = require('child_process').exec;
const SKIP_COMPASS = environment.argument('SKIP_COMPASS', false);
const COMPASS = environment.argument('COMPASS', 'compass');
const COMPASS_CMD = COMPASS +
  ' compile --relative-assets --output-style=expanded ' +
  '--css-dir=css --sass-dir=scss --images-dir=images --trace';
const CSS_REG = /\.css(\?.*)?$/;
const fs = require('ezzy-fs');
const getHandlebars = require('./handlebars');
const configSetup = require('ezzy-config-setup');

/**
 * The context parameters available.
 * @type {string}
 */
const CONTEXT_PARAMS = '/:a?/:b?/:c?/:d?/:e?/:f?/:g?/:h?/:i?/:j?/:k?/:l?/:m?' +
  '/:n?/:o?/:p?/:q?/:r?/:s?/:t?/:u?/:v?/:w?/:x?/:y?/:z?';

/**
 * The timeout to read files from the disk. In production is a permanent cache
 * that we don't restart until the server starts.
 * @type {number}
 */
const IO_CACHE_TIMEOUT = environment.development ? 100 : 0;

/**
 * Available error codes.
 * @type {Number[]}
 */
const ERROR_CODES = [
  400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414,
  415, 416, 417, 422, 423, 424, 425, 426, 428, 429, 431, 500, 501, 502, 503,
  504, 505, 406, 507, 509, 510, 511
];

class ExpressMvc {

  /**
   * @param {*} args The configuration arguments.
   */
  constructor(...args) {

    /**
     * @param {string=} directory The directory of the mvc sources.
     * @param {Function|Function[]=} middleware Any middleware that's required.
     * @param {RegExp|Function=} domainReg The regular expression for the domain or the function that will check if the route will be resolved.
     * @param {string[]|string=} statics The static routes to assign before anything. Note: These routes are directories matching the context of the folders within the application.
     * @param {boolean=} bind404 If we should bind a 404 route after all the controllers are bound to avoid continuing to any other applications.
     * @param {string|undefined=} customErrorDir The custom error directory where the application can find [error-status].html files.
     * @param {Function|Function[]=} globalMiddleware The global middleware to use on this and all other bound MVC applications.
     * @param {express=} expressDependency The express instance to be used if a certain version is required.
     * @param {string} partials The name of the partials directories.
     * @param {string} layouts The name of the layouts directories.
     * @param {string} helpersFile The file containing handlebars helpers.
     * @param {string[]} partialsDirectories Any additional directories to look for partials.
     * @param {string[]} layoutsDirectories Any additional directories to look for layouts.
     */
    const defaultConfig = {
      directory: undefined,
      middleware: undefined,
      domainReg: /.*/,
      statics: undefined,
      bind404: false,
      customErrorDir: 'errors',
      globalMiddleware: undefined,
      expressDependency: undefined,
      partials: undefined,
      layouts: undefined,
      helpersFile: undefined,
      partialsDirectories: [],
      layoutsDirectories: []
    };

    const config = configSetup(defaultConfig, args,
      ['this:object'],
      ['directory:string'],
      ['directory:string', 'bind404:boolean'],
      ['directory:string', 'middleware:array'],
      ['directory:string', 'domainReg:regexp|function'],
      ['directory:string', 'middleware:array', 'bind404:boolean'],
      ['directory:string', 'domainReg:regexp|function', 'statics:string'],
      ['directory:string', 'domainReg:regexp|function', 'bind404:boolean'],
      [
        'directory:string',
        'middleware:array|function',
        'globalMiddleware:array|function',
        'bind404:boolean'
      ],
      [
        'directory: string',
        'middleware: array | object | undefined',
        'domainReg: regexp | function | undefined',
        'statics: array | string | undefined',
        'bind404: boolean?',
        'customErrorDir: errors?',
        'globalMiddleware: array | object | undefined',
        'expressDependency: *'
      ]);

    const {
      directory,
      middleware,
      domainReg,
      statics,
      customErrorDir,
      globalMiddleware,
      expressDependency,
      partials,
      layouts,
      helpersFile,
      partialsDirectories,
      layoutsDirectories
    } = config;
    let {bind404} = config;

    if(!directory){
      throw new Error('No directory was defined in the configuration.');
    }

    // Bind the 404 route if we are auto checking for a different domain.
    if (bind404 === undefined) {
      bind404 = typeof domainReg !== 'function';
    }

    logger.debug({
      title: 'Express MVC',
      message: 'New MVC Application',
      data: config,
      borderTop: 3
    });

    /**
     * The express version we'll be using.
     * @type {*}
     * @private
     */
    const expr = expressDependency || express;

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
     * @type {String}
     */
    this._hbsDir = directory;

    /**
     * The initial handlebars instance.
     * @type {Promise}
     * @private
     */
    this._hbs = getHandlebars({
      directory,
      partials,
      layouts,
      helpersFile,
      partialsDirectories,
      layoutsDirectories
    });

    /**
     * Extra configuration.
     * @type {{}}
     * @private
     */
    this._extraConfig = {
      partials,
      layouts,
      helpersFile,
      partialsDirectories,
      layoutsDirectories
    };

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
     * The listening objects.
     * @type {array}
     * @private
     */
    this._listeners = [];

    /**
     * A storage of the configuration files.
     * @type {{}}
     * @private
     */
    this._configurations = {};

    /**
     * The directory to traverse while looking for errors.
     * @type {Promise.<Object>}
     * @private
     */
    this._errors = new Promise((resolve, reject) => {
      const generalErrorPromise = fs
        .readFilePromise(path.normalize(__dirname + '/../errors/general.hbs'));

      const errorDirs = [
        path.normalize(directory + '/' + customErrorDir + '/'),
        path.normalize(__dirname + '/../errors/')
      ];

      // Loop through the codes and find the custom error files.
      Promise.all(ERROR_CODES.map(code => {
        return fs
        // Check if the custom file exists.
          .existsPromise(`${errorDirs[0]}${code}.hbs`)
          .then(exists => exists ?
            fs.readFilePromise(`${errorDirs[0]}${code}.hbs`) :
            // Otherwise, check if default file exists (cached for other MVCs).
            fs.existsPromise(`${errorDirs[1]}${code}.hbs`)
              .then(exists => exists ?
                fs.readFilePromise(`${errorDirs[1]}${code}.hbs`) :
                // Finally, deliver a general error.
                generalErrorPromise))
      }))
      // Reduce the hbs file contents into compiled templates.
        .then(
          errorContents => {
            const errors = {};
            errorContents.forEach((content, i) => {
              errors[ERROR_CODES[i]] =
                handlebarsCore.compile(content.toString());
            });
            return generalErrorPromise
              .then(generalErrorContent => {
                errors.general =
                  handlebarsCore.compile(generalErrorContent.toString());
                resolve(errors);
              });
          },
          e => reject(e)
        );
    });

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

    // Bind all the global middleware regardless of domain or context.
    if (globalMiddleware) {
      (Array.isArray(globalMiddleware) ?
        globalMiddleware : [globalMiddleware])
        .forEach(handler => this.expressBasics.use(handler));
    }

    // Bind static paths
    if (statics) {
      (Array.isArray(statics) ? statics : [statics]).forEach(context => {
        const fullPath = path.normalize(this._directory + '/' + context);
        logger.debug('Static Route', `Binding ${fullPath} to ${context}`);
        this._express.use(context, expr.static(fullPath));
        this._express.use(context, (req, res) => res.status(404).end());
      });
    }

    // Bind any middleware that's required.
    this._middleware = !middleware ? Promise.resolve(true) : allFiles
      .then(() => {
        (Array.isArray(middleware) ? middleware : [middleware])
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
            const modelFile = matches[1] + 'Model.js';
            try {
              Model = require(modelFile);
              logger.debug('Model Lookup', `Looking for model ${modelFile}`);
            } catch (e) {
              logger.warn(`No model found ${modelFile}. Using generic model.`);
              viewFile = null;
              Model = null;
            }

            const Ctrl = require(file);
            const ctrl = new Ctrl(viewFile, Model, modelName,
              this._hbs, this._hbsDir, this._errors, this._extraConfig);
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
          ._domainHandle(basics, basics => Request.inst.notFoundError(basics)));
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
              return basics, assets;
            });
        }, IO_CACHE_TIMEOUT)
        .then(assets => {
          basics.request.assets = assets;
          controller.doRequest(basics);
        }));

    const context = this._getAbsPath(path.dirname(file));

    let args = [];

    const pathVars = controller.path || CONTEXT_PARAMS;

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
  async _getAssets(file) {
    const {assetsDir, configFile} = this._getControllerAssetNames(file);

    let css;
    let js;

    const exists = await fs.existsPromise(assetsDir);
    if (!exists) {
      logger.warn(`No assets found ${assetsDir}`);
      css = [];
      js = [];
    } else {
      logger.debug('Looking for assets in ' + assetsDir);
      const promise = environment.development ?
        this._getDevelopmentAssets(assetsDir) :
        this._getProductionAssets(assetsDir);
      const [cssAssets, jsAssets] = await promise;
      css = cssAssets;
      js = jsAssets;
    }

    const config = await this._getConfiguration(configFile);

    (config.dependencies || []).forEach(dependency => {
      if (CSS_REG.test(dependency)) {
        css.unshift(dependency);
      } else {
        js.unshift(dependency);
      }
    });

    const configCss = config.css || config.styles || config.stylesheets;
    const configJs = config.js || config.scripts || config.javascripts;

    if (configCss && Array.isArray(configCss)) {
      css = configCss.concat(css);
    }
    if (configJs && Array.isArray(configJs)) {
      js = configJs.concat(js);
    }

    logger.debug('Assets', {js, css});
    return {js, css, config};
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
            logger.warn(`No configuration file ${configFile}`);
            return {};
          }
        ), IO_CACHE_TIMEOUT);
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
              logger.warn(e);
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
              logger.warn(e);
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
              logger.warn(e);
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
              logger.warn(e);
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

    const pathVars = api.path || CONTEXT_PARAMS;

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
      this.expressBasics.use(basics => this._domainHandle(basics,
        basics => Request.inst.notFoundError(basics)));
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
      this._middleware,
      this._controllers,
      this._apis,
      this._nodeModules,
      this._notFound,
      this._errors
    ]).then(() => this);
  }

  /**
   * @param {*} args The arguments to pass to the constructor configuration.
   * @returns {Promise<ExpressMvc>}
   */
  async bindExpressMvc(...args) {
    await this.promise;
    const app = new ExpressMvc(...args);
    await app.promise;
    return this.express.use(app.express);
  }

  /**
   * Adds a listener to the app (usually used for SSL purposes).
   * @param {*} listener The new application listener.
   */
  addListener(listener) {
    this._listeners.push(listener);
  }

  /**
   * Closes the connection if it's active.
   * @returns {ExpressMvc}
   */
  close() {
    if (!this._listener) {
      logger.warn('Application is not listening to any ports.');
    }
    this._listener.close();
    this._listeners.forEach(listener => listener.close());
    this._listener = null;
    this._listeners = [];
    return this;
  }

}

module.exports = ExpressMvc;
