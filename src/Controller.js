const Request = require('./Request');
const fsPlus = require('ezzy-fs');
const logger = require('ezzy-logger').logger;
const environment = require('ezzy-environment');
const trueTypeof = require('ezzy-typeof');
const cache = require('./cache');

/**
 * Controller.
 */
class Controller extends Request {

  /**
   * An initializer of the controller.
   * @param {string} viewFile The raw path of the view template.
   * @param {Model} model The model to be used when rendering.
   * @param {string} modelName The name of the model.
   * @param {Promise.<Handlebars>} hbs The handlebars instance.
   * @param {Promise.<{}>} errors The errors to use (compiled hbs templates)
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
            assets: this.assetParser(basics, basics.request.assets)
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
   * Manipulates the assets found (if necessary) and populates them into
   * the model for parsing.
   * @param {HttpBasics} basics The http basics.
   * @param {{js:string[], css:string[]}} assets The assets.
   * @returns {{js:string[], css:string[]}}
   * @private
   */
  assetParser(basics, assets) {
    return assets;
  }

  /**
   * Parses the template.
   * @param data
   * @returns {*}
   * @private
   */
  async _parseTemplate(data) {
    const {handlebars, layouts, LAYOUT_REG} = await this._hbs;
    let cacheTemplate = cache.getLibrary('templates')
      .getOrElse(this._viewFile, async () => {
        let source;
        if (!this._viewFile) {
          source = '';
        } else {
          source = await fsPlus.readFilePromise(this._viewFile);
          source = source.toString();
        }
        const match = source.match(LAYOUT_REG);
        return {
          template: handlebars.compile(source),
          layout: match ? match[1] : null
        };
      }, environment.development ? 100 : 0);

    if (cacheTemplate instanceof Promise) {
      cacheTemplate = await cacheTemplate;
    }

    const {template, layout} = cacheTemplate;
    try {
      let renderedValue = template(data);
      // apply all layouts recursively
      if (layout) {
        let currentLayout = layout;
        while(currentLayout){
          renderedValue = layouts[currentLayout].render({
            content: renderedValue,
            body: renderedValue
          });
          currentLayout = layouts[currentLayout].parent;
        }
      }
      return renderedValue;
    } catch (e) {
      logger.error(e);
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
        logger.error(e);
        this.internalServerError(basics);
      }
    );
  }

}

module.exports = Controller;
