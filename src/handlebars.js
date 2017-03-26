const path = require('path');
const fsPlus = require('fs-plus');
const handlebars = require('handlebars');
const HBS_REG = /\.hbs$/;
const logger = require('logger').logger;

handlebars.registerPartial('styles', `
  {{#each assets.css}}
    <link rel="stylesheet" href="{{.}}" />
  {{/each}}
`);

handlebars.registerPartial('scripts', `
  {{#each assets.js}}
    <script src="{{.}}"></script>
  {{/each}}
`);

module.exports = dir => {

  const partials = path.normalize(dir + '/partials');

  return fsPlus.readdirPromise(partials)
    .then(files => {

      files = files.filter(file => HBS_REG.test(file));

      const fileNames =
        files.map(file => path.basename(file).replace(HBS_REG, ''));
      const promises =
        files.map(file => fsPlus
          .readFilePromise(path.normalize(dir + '/partials/' + file)));

      return Promise.all(promises)
        .then(values => {

          values.forEach((value, i) => {
            handlebars.registerPartial(fileNames[i], value.toString());
          });

          return handlebars;

        });

    }, e => {
      logger.warn(e);
      return handlebars;
    });
};
