'use strict';

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/disk-usage',
    handler: (request, reply) => {
      const response = { priority: 0, type: 'disk-usage', data: {} };

      return reply(response);
    },
  });

  next();
};

exports.register.attributes = {
  name: 'diskUsage',
  version: '0.0.1',
};
