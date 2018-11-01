'use strict';

const db = require('../db.js');

const MS_IN_DAY = 86400000;
const MAX_PRIORITY = 85;
const MIN_PRIORITY = 0;

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/nagbot',
    handler: (request, reply) => {
      db.getNags().then(nags => {
        if (!nags || !nags.length) {
          return reply({ priority: 0, type: 'nagbot', message: 'No nags found' });
        }

        const getPriority = nag => {
          const nextOccurence = new Date(nag.next);
          const now = new Date();

          const daysToNext = Math.floor((nextOccurence - now) / MS_IN_DAY);
          return Math.max(MIN_PRIORITY, MAX_PRIORITY - Math.exp(daysToNext));
        };

        return reply(nags.map(nag => ({
          priority: getPriority(nag),
          name: nag.name,
          next: nag.next,
          interval: nag.interval,
        })));
      });
    },
  });

  next();
};

exports.register.attributes = {
  name: 'nagbot',
  version: '0.0.1',
};
