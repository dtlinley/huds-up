'use strict';

const db = require('../db.js');

const MS_IN_DAY = 86400000;
const MAX_PRIORITY = 85;
const DAMPENING_FACTOR = 1.34;

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

        };

        return reply(nags.map(nag => {
          const nextOccurence = new Date(nag.next);
          const now = new Date();

          const daysToNext = (nextOccurence - now) / MS_IN_DAY;
          const adjustedDays = Math.max(
            (1 / DAMPENING_FACTOR),
            daysToNext + 1
          );
          const priority = MAX_PRIORITY / (DAMPENING_FACTOR * adjustedDays);

          return {
            daysToNext,
            id: nag.id,
            interval: nag.interval,
            name: nag.name,
            next: nag.next,
            priority,
            type: 'nagbot',
          };
        }));
      });
    },
  });

  next();
};

exports.register.attributes = {
  name: 'nagbot',
  version: '0.0.1',
};
