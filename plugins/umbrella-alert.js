'use strict';

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/umbrella-alert',
    handler: (request, reply) => {
      const response = { priority: 0, type: 'umbrella-alert', data: {} };

      return reply(response);
    },
  });

  next();
};

exports.register.attributes = {
  name: 'umbrellaAlert',
  version: '0.0.1',
};
