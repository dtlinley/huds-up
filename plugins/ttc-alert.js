'use strict';

const wreck = require('wreck');
const url = 'http://www.ttc.ca/Service_Advisories/all_service_alerts.jsp';

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/ttc-alert',
    handler: (request, reply) => {
      wreck.get(url, (err) => {
        if (err) {
          return reply({ priority: 80, type: 'ttc-alert', data: { error: err } });
        }

        const data = { priority: 0, type: 'ttc-alert', data: {} };

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
