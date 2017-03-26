const Request = require('./Request');
const fsPlus = require('fs-plus');
const error500 = fsPlus.readFilePromise(__dirname + '/../errors/500.hbs');
const error404 = fsPlus.readFilePromise(__dirname + '/../errors/404.hbs');
const error401 = fsPlus.readFilePromise(__dirname + '/../errors/401.hbs');
const logger = require('logger').logger;
const environment = require('environment');
const cache = require('./cache');

class Controller extends Request {

  /**
   * An initializer of the controller.
   * @param {string} viewFile The raw path of the view template.
   * @param {Model} model The model to be used when rendering.
   * @param {string} modelName The name of the model.
   * @param {Promise.<Handlebars>} hbs The handlebars instance.
   */
  constructor(viewFile, model, modelName, hbs) {
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
        dataPromise = model.getData(basics)
          .then(model => ({model, [this._modelName]: model}));
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
        this.serverError(basics);
      }
    );
  }

  /**
   * A server error response.
   * @param {HttpBasics} basics The http basics.
   */
  serverError(basics) {
    error500.then(content => {
      this.sendStatus(basics, 500);
      basics.response.send(content);
    });
  }

  /**
   * A response that the page wasn't found.
   * @param {HttpBasics} basics The http basics.
   */
  notFound(basics) {
    error404.then(content => {
      this.sendStatus(basics, 404);
      basics.response.send(content);
    });
  }

  /**
   * A response that the request needs to be authorized.
   * @param basics
   */
  unauthorized(basics) {
    error401.then(content => {
      this.sendStatus(basics, 401);
      basics.response.send(content);
    });
  }

}

module.exports = Controller;
