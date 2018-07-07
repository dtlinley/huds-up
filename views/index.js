const fs = require('fs');
const handlebars = require('handlebars');
// const Chart = require('chart.js');

exports.register = (server, options, next) => {
  server.views({
    engines: { html: handlebars },
    path: __dirname,
  });

  const registerPartial = (partial) => {
    handlebars.registerPartial(
      partial,
      fs.readFileSync(`views/${partial}.html`).toString()
    );
  };

  registerPartial('ttc-alert');
  registerPartial('disk-usage');
  registerPartial('backup-backintime');
  registerPartial('temperature-difference');
  registerPartial('umbrella-alert');

  handlebars.registerHelper('percent', (number) => number * 100);
  handlebars.registerHelper('toTimeString', (time) => {
    const date = new Date(time * 1000);
    return date.toLocaleTimeString();
  });
  handlebars.registerHelper('date', (time) => {
    const date = new Date(time * 1000);
    return date.toDateString();
  });
  handlebars.registerHelper('round', (number) => Math.round(number));
  handlebars.registerHelper('isPositive', (number) => number > 0);
  handlebars.registerHelper('isNegative', (number) => number < 0);
  handlebars.registerHelper('severityClass', (priority) => {
    if (priority >= 80) return 'high-priority';
    if (priority >= 50) return 'medium-priority';
    return 'low-priority';
  });

  server.route({
    method: 'GET',
    path: '/',
    handler: (request, reply) => {
      server.inject('/plugins').then((response) => {
        reply.view('index', { plugins: response.result });
      }, (err) => {
        server.log(['error'], err);
        reply.view('index');
      });
    },
  });

  server.route({
    method: 'GET',
    path: '/styles/{path*}',
    handler: {
      directory: {
        path: 'styles',
      },
    },
  });

  next();
};

exports.register.attributes = {
  name: 'hudsUpViews',
  version: '0.0.1',
};
