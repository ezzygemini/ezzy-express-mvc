const Request = require('./Request');
const fsPlus = require('ezzy-fs');
const logger = require('ezzy-logger').logger;
const environment = require('ezzy-environment');
const trueTypeof = require('ezzy-typeof');
const cache = require('./cache');
const getHandlebars = require('./handlebars');
const extractLayout = require('./utils/extractLayout');
const extractPartialNames = require('./utils/extractPartialNames');

/**
 * The timeout to read files from the disk. In production is a permanent cache
 * that we don't restart until the server starts.
 * @type {number}
 */
const IO_CACHE_TIMEOUT = environment.development ? 100 : 0;

/**
 * Controller.
 */
class Controller extends Request {

  /**
   * An initializer of the controller.
   * @param {string} viewFile The raw path of the view template.
   * @param {Model} model The model to be used when rendering.
   * @param {string} modelName The name of the model.
   * @param {Object} hbs The handlebars instance to be used for production.
   * @param {String} hbsDir The directory to use with handlebars.
   * @param {{}} extraConfig The extra configuration from the constructor.
   * @param {Promise.<{}>} errors The errors to use (compiled hbs templates)
   */
  constructor(viewFile, model, modelName, hbs, hbsDir, errors, extraConfig) {
    super();

    /**
     * The view that will be rendered.
     * @type {string}
     * @private
     */
    this._viewFile = viewFile;

    /**
     * The reference to the model to be used with the view.
     * @type {Model}
     * @private
     */
    this._model = model;

    /**
     * The name of the model
     * @type {string}
     * @private
     */
    this._modelName = modelName;

    /**
     * The directory of the application to be rendered during development.
     * @type {object}
     * @private
     */
    this._hbsDir = hbsDir;

    /**
     * The instance of handlebars to use for rendering.
     * @type {object}
     * @private
     */
    this._hbs = hbs;

    /**
     * The extra configuration used in the express mvc constructor.
     * @type {{}}
     * @private
     */
    this._extraConfig = extraConfig;

    /**
     * The errors used when displaying status codes.
     * @type {Promise.<Object>}
     * @private
     */
    this._errors = errors;
  }

  /**
   * Checks if we have a view.
   * @returns {boolean}
   */
  get hasView() {
    return !!this._viewFile;
  }

  /**
   * Checks if we have a model.
   * @returns {boolean}
   */
  get hasModel() {
    return !!this._model;
  }

  /**
   * Default controller get method.
   * @param {HttpBasics} basics The http basics.
   */
  doGet(basics) {
    this.send(basics);
  }

  /**
   * Default controller post method.
   * @param {HttpBasics} basics The http basics.
   */
  doPost(basics) {
    this.send(basics);
  }

  /**
   * The render function that merges the template with the model.
   * @param {HttpBasics=} basics The http basics.
   * @returns {Promise.<string>}
   */
  async render(basics = {}) {
    let data;
    if (this._model) {
      try {
        const Model = this._model;
        const model = new Model(basics);
        data = await model.getData(basics);
        if (!(data instanceof Model) && trueTypeof(data) !== 'object') {
          data = {data};
        }
        let {assets} = basics.request;
        const config = await this.configParser(basics,
          Object.assign(data.config || {}, assets.config));
        assets = await this.assetParser(basics, assets);
        Object.assign(data, model, {config, assets});
      } catch (e) {
        logger.error(basics, e);
        data = basics;
      }
    } else {
      data = basics;
    }
    return await this._parseTemplate(basics, data);
  }


  /**
   * Manipulates the assets found (if necessary) and populates them into
   * the model for parsing.
   * NOTE: This method is important so other controllers can override it
   * and parse the assets as needed.
   * @param {HttpBasics} basics The http basics.
   * @param {{js:string[], css:string[]}} assets The assets.
   * @returns {{js:string[], css:string[]}}
   * @private
   */
  assetParser(basics, assets) {
    return assets;
  }

  /**
   * Manipulates the configuration found (if necessary) and populates it into
   * the model for parsing.
   * NOTE: This method is important so other controllers can override it and
   * parse the configuration as needed.
   * @param {HttpBasics} basics The http basics.
   * @param {{js:string[], css:string[]}} assets The assets.
   * @returns {{js:string[], css:string[]}}
   * @private
   */
  configParser(basics, config) {
    return config || {};
  }

  /**
   * Method used to parse the cached view.
   * Note: This method is important so other controllers can override it and
   * parse the view as needed.
   * @param {HttpBasics} basics The http basics.
   * @param {string} viewCode The rendered view.
   * @param {object} data The optional data to use to render the template.
   * @param {string[]} partials The partials used in the view.
   * @override
   * @returns {*}
   */
  viewParser(basics, viewCode, data, partials) {
    return viewCode;
  }

  /**
   * Method used to parse the data right before it's sent to the view.
   * @param {HttpBasics} basics The http basics.
   * @param {object} data The data object to parse.
   * @param {string[]} partials The view partials.
   * @returns {*}
   */
  dataParser(basics, data, partials){
    return data;
  }

  /**
   * Parses the template.
   * @param {HttpBasics} basics The http basics.
   * @param {object} data The optional data to use to render the template.
   * @returns {*}
   * @private
   */
  async _parseTemplate(basics, data) {

    // Get the instance of handlebars.
    const hbs = !environment.development ? this._hbs :
      cache.getLibrary('handlebars')
        .getOrElse('inst', () => getHandlebars(Object.assign({
          directory: this._hbsDir,
        }, this._extraConfig)), IO_CACHE_TIMEOUT);

    // Wait for it to start loading.
    const {handlebars, layouts} = await hbs;

    // Get the view file.
    let cachedView = await cache.getLibrary('hbsViews')
      .getOrElse(this._viewFile, async () => {
        let source;
        if (!this._viewFile) {
          source = '';
        } else {
          source = await fsPlus.readFilePromise(this._viewFile);
          source = source.toString();
        }
        return {
          partials: extractPartialNames(source),
          view: handlebars.compile(source),
          layout: extractLayout(source)
        };
      }, IO_CACHE_TIMEOUT);

    let renderedValue;
    const {view, layout, partials} = cachedView;
    try {
      data = await this.dataParser(basics, data, partials);
      renderedValue = await this.viewParser(basics, view(data), data, partials);
      // apply all layouts recursively
      if (layout) {
        let currentLayout = layout;
        while (currentLayout) {
          data = await this.dataParser(basics, Object.assign(data, {
            content: renderedValue,
            body: renderedValue
          }), layouts[currentLayout].partials);
          renderedValue = layouts[currentLayout].render(data);
          currentLayout = layouts[currentLayout].parent;
        }
      }
      return renderedValue;
    } catch (e) {
      logger.error(basics, e);
      return e;
    }
  }

  /**
   * Sends the content to the browser.
   * @param {HttpBasics} basics The http basics.
   * @returns {void}
   */
  send(basics) {
    this.render(basics).then(
      parsed => {
        this.sendStatus(basics, 200);
        basics.response.send(parsed);
      },
      e => {
        logger.error(basics, e);
        this.internalServerError(basics);
      }
    );
  }

}

module.exports = Controller;
