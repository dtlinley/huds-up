'use strict';

const cheerio = require('cheerio');
const cache = require('../cache.js');

const ALERT_URL = 'http://www.ttc.ca/Service_Advisories/all_service_alerts.jsp';
const ELEVATOR_BROKEN = 'Elevator out of service';
const ELEVATOR_FIXED = 'Elevator back in service';
const HIGH_PRIORITY = 30;

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/ttc-alert',
    handler: (request, reply) => {
      if (process.env.TTC_ROUTES_STATIONS === '') {
        const response = { priority: 0, type: 'ttc-alert', data: {} };

        return reply(response);
      }

      return cache.get(ALERT_URL).then((payload) => {
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

        const important = filtered.filter((alert) =>
          !alert.includes(ELEVATOR_BROKEN) && !alert.includes(ELEVATOR_FIXED)
        );

        let priority = filtered.length > 0 ? 10 : 3;
        if (important.length > 0) {
          priority = HIGH_PRIORITY;
        }
        const data = { priority, type: 'ttc-alert', data: { alerts: filtered } };

        reply(data);
      }).catch((err) => {
        reply({ priority: 80, type: 'ttc-alert', data: { error: err } });
      });
    },
  });

  next();
};

exports.register.attributes = {
  name: 'ttcAlert',
  version: '0.0.1',
};
