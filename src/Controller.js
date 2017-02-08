const Request = require('./Request');
const handlebars = require('handlebars');
const fsPlus = require('fs-plus');
const error500 = fsPlus.readFilePromise(__dirname + '/../errors/500.hbs');
const error404 = fsPlus.readFilePromise(__dirname + '/../errors/404.hbs');
const error401 = fsPlus.readFilePromise(__dirname + '/../errors/401.hbs');
const logger = require('logger').logger;

class Controller extends Request {

  /**
   * An initializer of the controller.
   * @param {string} viewFile The raw path of the view template.
   * @param {Model} model The model to be used when rendering.
   */
  constructor(viewFile, model) {
    super();

    this._viewFile = viewFile;

    /**
     * The template that will be rendered with the view.
     *
     * @type {Promise.<Function>}
     */
    this.template =
      (!viewFile ? Promise.resolve('') : fsPlus.readFilePromise(viewFile))
        .then(
          content => handlebars.compile(content.toString()),
          e => {
            logger.error(e);
            return handlebars.compile('');
          }
        );

    /**
     * The reference to the model to be used with the view.
     */
    this.model = model;
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
    return !!this.model;
  }

  /**
   * Handles the request.
   * @param {HttpBasics} basics The http basics.
   */
  requestHandler(basics) {
    if (basics.request.method === 'POST') {
      this.doPost(basics);
    } else {
      this.doGet(basics);
    }
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
    return this.template.then(template => {
      let model;
      if (this.model) {
        try{
          const Model = this.model;
          model = new Model(basics);
          return model.data.then(obj => template(obj));
        }catch(e){
          logger.error(e);
        }
      }
      return template(basics.request);
    });
  }

  /**
   * Sends the content to the browser.
   * @param {HttpBasics} basics The http basics.
   * @returns {void}
   */
  send(basics) {
    this.render().then(
      parsed => basics.response.send(parsed),
      e => this.serverError(basics)
    );
  }

  /**
   * A server error response.
   * @param {HttpBasics} basics The http basics.
   */
  serverError(basics) {
    error500.then(content => {
      super.sendStatus(basics, 500);
      basics.response.send(content);
    });
  }

  /**
   * A response that the page wasn't found.
   * @param {HttpBasics} basics The http basics.
   */
  notFound(basics) {
    error404.then(content => {
      super.sendStatus(basics, 404);
      basics.response.send(content);
    });
  }

  /**
   * A response that the request needs to be authorized.
   * @param basics
   */
  unauthorized(basics) {
    error401.then(content => {
      super.sendStatus(basics, 401);
      basics.response.send(content);
    });
  }

}

module.exports = Controller;
