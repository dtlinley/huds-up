'use strict';

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/template-plugin',
    handler: (request, reply) => {
      const response = { priority: 0, type: 'template-plugin', data: {} };

      return reply(response);
    },
  });

  next();
};

exports.register.attributes = {
  name: 'templatePlugin',
  version: '0.0.1',
};
