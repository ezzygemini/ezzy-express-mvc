const express = require('express');
const logger = require('logger').logger;
const recursive = require('recursive-fs')
const path = require('path');
const Api = require('./Api');
const Controller = require('./Controller');

class ExpressMvc {

  /**
   * @param {string=} directory The directory of the mvc sources.
   * @param {express=} expressInstance The express instance to be used.
   */
  constructor (directory, expressInstance) {

    /**
     * The directory where we'll be looking for controllers and apis.
     */
    this._directory = path.normalize(directory) || process.cwd();

    /**
     * The express instance.
     */
    this._express = expressInstance || express();

    /**
     * Obtains all the js files.
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
      })
    });

    /**
     * The controllers found in the directory.
     * @type {Promise.<Controller[]>}
     * @private
     */
    this._controllers = allJsFiles
      .then(files => files
        .filter(file => /(Ctrl|Controller)\.js$/.test(file))
        .map(file => {
          const Ctrl = require(file.toString());
          return new Ctrl();
        })
        .filter(ctrl => ctrl instanceof Controller));

    /**
     * The apis found in the directory.
     * @type {Promise.<Api[]>}
     * @private
     */
    this._apis = allJsFiles
      .then(files => files.filter(file => /Api\.js$/.test(file))
        .map(file => {
          const SubApi = require(file.toString());
          return new SubApi();
        })
        .filter(ctrl => ctrl instanceof Api));

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

}

module.exports = ExpressMvc;
