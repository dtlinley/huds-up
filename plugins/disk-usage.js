'use strict';

const PRIORITY_MAX = 90;
const CARE_THRESHOLD = 60; // Only disk usage above this should have any priority
const SCALING_FACTOR = PRIORITY_MAX / (100 - CARE_THRESHOLD);

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/disk-usage',
    handler: (request, reply) => {
      const response = { priority: 0, type: 'disk-usage', data: { filesystems: [] } };

      return reply(response);
    },
  });

  next();
};

exports.register.attributes = {
  name: 'diskUsage',
  version: '0.0.1',
};
