'use strict';

const wreck = require('wreck');
const cheerio = require('cheerio');
const url = 'http://www.ttc.ca/Service_Advisories/all_service_alerts.jsp';

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/ttc-alert',
    handler: (request, reply) => {
      wreck.get(url, (err, response, payload) => {
        if (err) {
          return reply({ priority: 80, type: 'ttc-alert', data: { error: err } });
        }

        const dom = cheerio.load(payload.toString());
        const alerts = [];
        dom('.alert-content p.veh-replace').map((i, elem) => dom(elem).text())
        .each((i, alert) => alerts.push(alert));
        const routes = process.env.TTC_ROUTES_STATIONS.split(',').map(str => str.trim());
        const filtered = alerts.filter(alert => {
          let found = false;
          routes.forEach(route => {
            if (alert.includes(route)) {
              found = true;
            }
          });
          return found;
        });

        const priority = filtered.length > 0 ? 85 : 3;
        const data = { priority, type: 'ttc-alert', data: { alerts: filtered } };

        return reply(data);
      });
    },
  });

  next();
};

exports.register.attributes = {
  name: 'ttcAlert',
  version: '0.0.1',
};
