exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/back-in-time-backup',
    handler: (request, reply) => {
      reply({ priority: 1, type: 'backup.backintime', data: { foo: 'bar' } });
    },
  });

  next();
};

exports.register.attributes = {
  name: 'backInTime',
  version: '0.0.1',
};
