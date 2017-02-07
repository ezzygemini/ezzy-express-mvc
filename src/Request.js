const DEFAULT_CONTENT_TYPE = '*/*';

class Request {

  /**
   * Obtains the options of the api.
   * @returns {*}
   */
  get options() {
  }

  /**
   * Basic GET handler.
   * @param {HttpBasics} basics The http basics.
   */
  doGet(basics) {
    this.sendStatus(basics, 501);
  }

  /**
   * Indicates what content type is accepted on GET requests.
   * @returns {string}
   */
  get acceptGet() {
    return DEFAULT_CONTENT_TYPE;
  }

  /**
   * Basic POST handler.
   * @param {HttpBasics} basics The http basics.
   */
  doPost(basics) {
    this.sendStatus(basics, 501);
  }

  /**
   * Indicates what content type is accepted on POST requests.
   * @returns {string}
   */
  get acceptPost() {
    return DEFAULT_CONTENT_TYPE;
  }

  /**
   * Basic PATCH handler.
   * @param {HttpBasics} basics The http basics.
   */
  doPatch(basics) {
    this.sendStatus(basics, 501);
  }

  /**
   * Indicates what content type is accepted on PATCH requests.
   * @returns {string}
   */
  get acceptPatch() {
    return DEFAULT_CONTENT_TYPE;
  }

  /**
   * Basic DELETE handler.
   * @param {HttpBasics} basics The http basics.
   */
  doDelete(basics) {
    this.sendStatus(basics, 501);
  }

  /**
   * Indicates what content type is accepted on DELETE requests.
   * @returns {string}
   */
  get acceptDelete() {
    return DEFAULT_CONTENT_TYPE;
  }

  /**
   * Basic PUT handler.
   * @param {HttpBasics} basics The http basics.
   */
  doPut(basics) {
    this.sendStatus(basics, 501);
  }

  /**
   * Indicates what content type is accepted on PUT requests.
   * @returns {string}
   */
  get acceptPut() {
    return DEFAULT_CONTENT_TYPE;
  }

  /**
   * Sends a 500 error on the page.
   * @param {HttpBasics} basics The http basics.
   * @param {number} status The request status to send.
   */
  sendStatus(basics, status = 200) {
    basics.response.status(status);
  }

}

module.exports = Request;
