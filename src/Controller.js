const Request = require('./Request');
const fsPlus = require('ezzy-fs');
const logger = require('ezzy-logger').logger;
const environment = require('ezzy-environment');
const trueTypeof = require('ezzy-typeof');
const cache = require('./cache');
let cdn = environment.getConfiguration('cdn');

// Prefixes the cdn in case there is no protocol.
if (cdn && !/^(\/\/|http)/.test(cdn)) {
  cdn = '//' + cdn;
}

class Controller extends Request {

  /**
   * An initializer of the controller.
   * @param {string} viewFile The raw path of the view template.
   * @param {Model} model The model to be used when rendering.
   * @param {string} modelName The name of the model.
   * @param {Promise.<Handlebars>} hbs The handlebars instance.
   * @param {Promise.<Object>} errors The errors to use (compiled hbs templates)
   */
  constructor(viewFile, model, modelName, hbs, errors) {
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
     * The instance of handlebars to use for rendering.
     * @type {object}
     * @private
     */
    this._hbs = hbs;

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
  render(basics = {}) {
    let dataPromise;
    if (this._model) {
      try {

        const Model = this._model;
        const model = new Model(basics);

        dataPromise = model.getData(basics);
        if (!(dataPromise instanceof Promise)) {
          dataPromise = Promise.resolve(dataPromise);
        }

        dataPromise.then((data) => {
          if (trueTypeof(data) !== 'object') {
            data = {data};
          }
          return Object.assign(data, model, {
            assets: this._cdnify(basics, basics.request.assets)
          });
        });

      } catch (e) {
        logger.error(e);
        dataPromise = Promise.resolve(basics);
      }
    } else {
      dataPromise = Promise.resolve(basics);
    }
    return dataPromise.then(data => this._parseTemplate(data));
  }


  /**
   * Turns all the assets files into a CDN request based on configuration.
   * @param {HttpBasics} basics The http basics.
   * @param {Object} assets The assets.
   * @returns {*}
   * @private
   */
  _cdnify(basics, assets) {
    if (!assets || !cdn) {
      return assets;
    }
    if (assets.js && assets.js.length) {
      assets.js = assets.js
        .map(asset => `${cdn}/v/${basics.request.hostname}${asset}`);
    }
    if (assets.css && assets.css.length) {
      assets.css = assets.css
        .map(asset => `${cdn}/v/${basics.request.hostname}${asset}`);
    }
    return assets;
  }

  /**
   * Parses the template.
   * @param data
   * @returns {*}
   * @private
   */
  _parseTemplate(data) {
    return cache.getLibrary('templates')
      .getOrElse(this._viewFile, () => {
        let contentPromise;
        if (!this._viewFile) {
          contentPromise = Promise.resolve('');
        } else {
          contentPromise = fsPlus.readFilePromise(this._viewFile);
        }
        return contentPromise
          .then(content => this._hbs
            .then(hbs => hbs.compile(content.toString())));
      }, environment.development ? 100 : 0)
      .then(template => {
        try {
          return template(data);
        } catch (e) {
          logger.error(e);
          return e;
        }
      });
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
        logger.error(e);
        this.internalServerError(basics);
      }
    );
  }

}

module.exports = Controller;
