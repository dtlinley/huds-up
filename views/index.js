const fs = require('fs');
const handlebars = require('handlebars');

exports.register = (server, options, next) => {
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
  registerPartial('nagbot');

  handlebars.registerHelper('percent', (number) => Math.floor(number * 100));
  handlebars.registerHelper('toTimeString', (time) => {
    // Input like "202304022200"
    // Should output the locale time string version of April 2nd, 2023, 22:00Z
    const formatted = `${time.substring(0, 4)}-${time.substring(4, 6)}-${time.substring(6, 8)}T${time.substring(8, 10)}:00:00Z`; // eslint-disable-line max-len
    const date = new Date(formatted);
    if (date.getHours() === 0) {
      return date.toDateString();
    }
    return date.toLocaleTimeString();
  });
  handlebars.registerHelper('dateFromTime', (time) => {
    const date = new Date(time * 1000);
    return date.toDateString();
  });
  handlebars.registerHelper('formatDate', (date) => date.toDateString());
  handlebars.registerHelper('round', (number) => Math.round(number));
  handlebars.registerHelper('isPositive', (number) => number > 0);
  handlebars.registerHelper('isNegative', (number) => number < 0);
  handlebars.registerHelper('severityClass', (priority) => {
    if (priority >= 80) return 'high-priority';
    if (priority >= 50) return 'medium-priority';
    return 'low-priority';
  });
  handlebars.registerHelper('lessThan', (number, comparedTo) => number < comparedTo);

  // Nagbot
  handlebars.registerHelper('todayPlusInterval', (interval) => {
    const date = new Date((new Date()).setHours(24, 0, 0, 0));
    if (interval.days) {
      return (new Date(date.setDate(date.getDate() + interval.days))).toISOString();
    } else if (interval.months) {
      return (new Date(date.setMonth(date.getMonth() + interval.months))).toISOString();
    }

    return date.toISOString();
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
    path: '/nag/new',
    handler: (request, reply) => {
      reply.view('nagbot/new');
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
