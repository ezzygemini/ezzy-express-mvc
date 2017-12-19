const path = require('path');
const fsPlus = require('ezzy-fs');
const handlebars = require('handlebars');
const HBS_REG = /\.(hbs|handlebars)$/;
const PARTIAL_HBS_REG = /.*\/partials\/[\w]+\.(hbs|handlebars)$/;
const logger = require('ezzy-logger').logger;
const recursive = require('recursive-readdir-sync');

handlebars.registerPartial('styles', `
  {{#each externalStyles}}
    <link rel="stylesheet" href="{{{.}}}" />
  {{/each}}
  {{#each assets.css}}
    <link rel="stylesheet" href="{{{.}}}" />
  {{/each}}
  {{#each styles}}
    <style type="text/css">
    {{{.}}}
    </style>
  {{/each}}
`);

handlebars.registerPartial('scripts', `
  {{#with bootstrap}}
    <script type="application/javascript">
    {{{.}}}
    </script>
  {{/with}}
  {{#each externalScripts}}
    <script src="{{{.}}}"></script>
  {{/each}}
  {{#each assets.js}}
    <script src="{{{.}}}"></script>
  {{/each}}
  {{#each scripts}}
    <script type="application/javascript">
    {{{.}}}
    </script>
  {{/each}}
`);

module.exports = dir => {
  const cleanDir = path.normalize(dir + '/');
  const allPartials = recursive(cleanDir)
    .filter(item => PARTIAL_HBS_REG.test(item));

  logger.debug('Handlebar Partials', allPartials);

  return Promise
    .all(allPartials.map(partialSrc => fsPlus.readFilePromise(partialSrc)))
    .then(sources => {
      sources.forEach((source, i) => {
        const name = allPartials[i].replace(cleanDir, '').replace(HBS_REG, '');
        logger.debug('Handlebar Partial', name);
        handlebars.registerPartial(name, source.toString());
      });
      return handlebars;
    });
};

// module.exports = dir => {
//
//   const partials = path.normalize(dir + '/partials');
//
//   return fsPlus.readdirPromise(partials)
//     .then(files => {
//
//       files = files.filter(file => HBS_REG.test(file));
//
//       const fileNames =
//         files.map(file => path.basename(file).replace(HBS_REG, ''));
//       const promises =
//         files.map(file => fsPlus
//           .readFilePromise(path.normalize(dir + '/partials/' + file)));
//
//       return Promise.all(promises)
//         .then(values => {
//
//           values.forEach((value, i) => {
//             handlebars.registerPartial(fileNames[i], value.toString());
//           });
//
//           return handlebars;
//
//         });
//
//     }, () => {
//       logger.warn(`No partials found ${partials}`);
//       return handlebars;
//     });
// };
