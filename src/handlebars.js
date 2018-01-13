const path = require('path');
const fsPlus = require('ezzy-fs');
const handlebars = require('handlebars');
const HBS_REG = /\.(hbs|handlebars)$/;
const PARTIAL_HBS_REG = /.*\/partials\/[\w]+\.(hbs|handlebars)$/;
const LAYOUTS_HBS_REG = /.*\/layouts\/[\w]+\.(hbs|handlebars)$/;
const logger = require('ezzy-logger').logger;
const recursive = require('recursive-readdir-sync');
const LAYOUT_REG = /{{!<\s*([\w\/.]+)\s*}}/i;

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

/**
 * Returns a properly formatted html attribute if the value exists.
 * @param attributeName
 * @param value
 */
const htmlAttribute = (attributeName, value) =>
  (value ? new handlebars.SafeString(` ${attributeName}="${value}"`) : '');

handlebars.registerHelper('iif', (value, defaultValue) =>
  new handlebars.SafeString(value !== 'undefined' ? value : defaultValue));

handlebars.registerHelper('attr', htmlAttribute);

handlebars.registerHelper('class', (...args) =>
  htmlAttribute('class', args.filter(cls =>
    typeof cls === 'string' && !!cls).join(' ')));

module.exports = async dir => {
  const cleanDir = path.normalize(dir + '/');
  const allFiles = recursive(cleanDir);
  const allPartials = allFiles.filter(item => PARTIAL_HBS_REG.test(item));
  const allLayouts = allFiles.filter(item => LAYOUTS_HBS_REG.test(item));

  logger.debug('Handlebars Partials', allPartials);
  logger.debug('Handlebars Layouts', allLayouts);

  const partialSources = await Promise
    .all(allPartials.map(partialSrc => fsPlus.readFilePromise(partialSrc)
      .then(src => src.toString())));

  partialSources.forEach((source, i) => {
    const name = allPartials[i].replace(cleanDir, '').replace(HBS_REG, '');
    logger.debug('Handlebars Partial', name);
    handlebars.registerPartial(name, source);
  });

  const layouts = {};

  const layoutSources = await Promise
    .all(allLayouts.map(layoutSrc => fsPlus.readFilePromise(layoutSrc)
      .then(src => src.toString())));

  layoutSources.forEach((source, i) => {
    const name = allLayouts[i].replace(cleanDir, '').replace(HBS_REG, '');
    const matches = source.match(LAYOUT_REG);
    layouts[name] = {
      render: handlebars.compile(source.toString()),
      parent: matches ? matches[1] : null
    };
    logger.debug('Handlebars Layout',
      name + (matches ? ` extends (${matches[1]})` : ''));
  });

  return {handlebars, layouts, LAYOUT_REG};
};
