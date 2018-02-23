# ezzy-express-mvc
[![Build Status](https://travis-ci.org/ezzygemini/ezzy-express-mvc.svg?branch=master)](https://travis-ci.org/ezzygemini/ezzy-express-mvc)
[![Coverage Status](https://coveralls.io/repos/github/ezzy-ezzygemini/express-mvc/badge.svg?branch=master)](https://coveralls.io/github/ezzygemini/ezzy-express-mvc?branch=master)

A complete mvc infrastructure to render pages from a specific directory based.

You can use this class to recurse through a directory that contains 
Controllers, Models and Views to prepare an application with multiple
routes mapped accordingly.

For example, you can structure your directory in this manner:

- /src/ _(root)_
- /src/HomeController.js _(home app)_
- /src/HomeModel.js
- /src/homeView.hbs
- /src/login/LoginController.js _(login app)_
- /src/login/LoginModel.js
- /src/login/loginView.hbs
- /src/partials/customPartial.hbs _(other handlebars tools)_
- /src/layouts/baseLayout.hbs
- /src/helpers/customHelper.hbs

And now in your localhost.js file, you can simply invoke it like this:

```javascript
const ExpressMvc = require('ezzy-express-mvc');
new ExpressMvc(__dirname + '/src')
  .promise // we have to wait for file detection.
  .then(app => app.listen(9000));
```

If you'd like to bind other applications to the same port, simply use:
```javascript
const ExpressMvc = require('ezzy-express-mvc');
new ExpressMvc(__dirname + '/src')
  .promise
  .then(app => app.bindExpressMvc(__dirname + '/anotherDirectory'))
  .then(app => app.listen(9000));
```

## Constructor Configuration

```javascript
    /**
     * @param {string} directory The directory of the mvc sources.
     * @param {Function|Function[]} middleware Any middleware that's required.
     * @param {function({HttpBasics}):boolean} requestFilter The filter function that decides if this instance of the MVC application will handle the request.
     * @param {RegExp} domainReg The regular expression for the domain or the function that will check if the route will be resolved.
     * @param {string[]|string} statics The static routes to assign before anything. Note: These routes are directories matching the context of the folders within the application.
     * @param {boolean} bind404 If we should bind a 404 route after all the controllers are bound to avoid continuing to any other applications.
     * @param {string} customErrorDir The custom error directory where the application can find [error-status].html files.
     * @param {Function|Function[]} globalMiddleware The global middleware to use on this and all other bound MVC applications.
     * @param {express} expressDependency The express instance to be used if a certain version is required.
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
      requestFilter: undefined,
      customErrorDir: 'errors',
      globalMiddleware: undefined,
      expressDependency: undefined,
      partials: undefined,
      layouts: undefined,
      helpersFile: undefined,
      partialsDirectories: [],
      layoutsDirectories: []
    };
```
