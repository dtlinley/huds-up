'use strict';

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/nagbot',
    handler: (request, reply) => {
      const response = { priority: 0, type: 'nagbot', data: {} };

      return reply(response);
    },
  });

  next();
};

exports.register.attributes = {
  name: 'nagbot',
  version: '0.0.1',
};
