'use strict';

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/temperature-difference',
    handler: (request, reply) => {
      const response = { priority: 0, type: 'temperature-difference', data: {} };

      return reply(response);
    },
  });

  next();
};

exports.register.attributes = {
  name: 'temperatureDifference',
  version: '0.0.1',
};
