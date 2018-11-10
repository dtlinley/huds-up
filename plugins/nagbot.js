'use strict';

const db = require('../db.js');

const MS_IN_DAY = 86400000;
const MAX_PRIORITY = 85;
const DAMPENING_FACTOR = 1.3;

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/nagbot',
    handler: (request, reply) => {
      db.getNags().then(nags => {
        if (!nags || !nags.length) {
          return reply({ priority: 0, type: 'nagbot', message: 'No nags found' });
        }

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
            priority,
            type: 'nagbot',
            data: {
              daysToNext,
              id: nag.id,
              interval: nag.interval,
              name: nag.name,
              next: nag.next,
            },
          };
        }));
      }, error => {
        server.log(['error'], error.stack);
        reply({
          priority: 60,
          type: 'nagbot',
          data: {
            error,
            message: 'Could not fetch nags',
          },
        });
      });
    },
  });

  // API for handling calls from plain HTML forms.
  // Updates a single nag with the provided parameters.
  server.route({
    method: 'POST',
    path: '/plugins/nagbot/formapi/nags/{id}',
    handler: (request, reply) => {
      db.updateNag(parseInt(request.params.id, 10), request.payload);
      reply.view('nagbot/formapi-update');
    },
  });

  next();
};

exports.register.attributes = {
  name: 'nagbot',
  version: '0.0.1',
};
