'use strict';

const df = require('node-df');
const PRIORITY_MAX = 90;
const CARE_THRESHOLD = 60; // Only disk usage above this should have any priority
const SCALING_FACTOR = PRIORITY_MAX / (100 - CARE_THRESHOLD);

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/disk-usage',
    handler: (request, reply) => {
      const response = { priority: 0, type: 'disk-usage', data: { filesystems: [] } };

      if (!process.env.DISK_FREE_MOUNTS || process.env.DISK_FREE_MOUNTS.length <= 0) {
        return reply(response);
      }

      return df((err, fs) => {
        if (err) {
          const error = {
            priority: 85,
            type: 'disk-usage',
            data: { message: `Could not read disk information: ${err}` },
          };
          return reply(error);
        }

        const mounts = process.env.DISK_FREE_MOUNTS.split(',');
        const filtered = fs.filter(
          filesystem => mounts.indexOf(filesystem.mount) >= 0
        );
        response.data.filesystems = filtered;

        if (filtered.length === 0 && mounts && mounts.length > 0) {
          response.priority = 85;
          response.data.message =
            'Disk monitor is looking for disk mounts, but no matching mounts found';
        } else if (filtered.length > 0) {
          const highCapacity = parseFloat(
            filtered.reduce((max, info) => Math.max(max, info.capacity), 0).toFixed(2)
          );
          const priority = ((highCapacity * 100) - CARE_THRESHOLD) * SCALING_FACTOR;
          response.priority = Math.max(priority, 2);
        }
        return reply(response);
      });
    },
  });

  next();
};

exports.register.attributes = {
  name: 'diskUsage',
  version: '0.0.1',
};
