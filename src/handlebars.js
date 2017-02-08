const handlebars = require('handlebars');

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

module.exports = handlebars;
