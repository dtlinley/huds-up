'use strict';

const db = require('../db.js');

const MS_IN_DAY = 86400000;
const MAX_PRIORITY = 85;
const DAMPENING_FACTOR = 1.3;

const proportionTimeLeft = (nextOccurence, interval) => {
  const today = new Date();
  let todayPlusInterval = new Date();
  if (interval.days) {
    todayPlusInterval = new Date(
      todayPlusInterval.setDate(todayPlusInterval.getDate() + interval.days)
    );
  } else if (interval.months) {
    todayPlusInterval = new Date(
      todayPlusInterval.setMonth(todayPlusInterval.getMonth() + interval.months)
    );
  }

  return Math.max(
    0,
    (nextOccurence - today) / Math.max(1, (todayPlusInterval - today))
  );
};

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
          const proportionLeft = proportionTimeLeft(nextOccurence, nag.interval);
          const priority = MAX_PRIORITY * (1 - proportionLeft) / (DAMPENING_FACTOR * adjustedDays);

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
      db.updateNag(parseInt(request.params.id, 10), request.payload)
      .then(() => {
        reply.view('nagbot/formapi-update');
      }, (error) => {
        reply.view('nagbot/formapi-error', { operationType: 'updated', error });
      });
    },
  });

  server.route({
    method: 'PUT',
    path: '/plugins/nagbot/nags/{id}',
    handler: (request, reply) => {
      const id = parseInt(request.params.id, 10);
      db.updateNag(id, request.payload)
      .then((nag) => reply(nag))
      .catch((error) =>
        reply({ data: { error, message: 'Update failed. Please try again later.' } })
      );
    },
  });

  server.route({
    method: 'POST',
    path: '/plugins/nagbot/formapi/nags',
    handler: (request, reply) => {
      const nag = {
        name: request.payload.name,
        next: request.payload.next,
        interval:
          `${request.payload.intervalCount} ${request.payload.intervalLength}`,
      };
      db.createNag(nag).then(() => {
        reply.view('nagbot/formapi-create', { nag });
      }, error => {
        reply.view('nagbot/formapi-error', { operationType: 'created', error });
      });
    },
  });

  server.route({
    method: 'POST',
    path: '/plugins/nagbot/nags',
    handler: (request, reply) => {
      const nag = {
        name: request.payload.name,
        next: request.payload.next,
        interval:
          `${request.payload.intervalCount} ${request.payload.intervalLength}`,
      };
      db.createNag(nag)
      .then((newNag) => reply(newNag))
      .catch(error => {
        reply({ data: { error, message: 'Failed to create nag. Please try again later.' } });
      });
    },
  });

  server.route({
    method: 'POST',
    path: '/plugins/nagbot/formapi/nags/{id}/delete',
    handler: (request, reply) => {
      db.deleteNag(parseInt(request.params.id, 10))
      .then(() => reply.view('nagbot/formapi-delete'))
      .catch((error) =>
        reply.view('nagbot/formapi-error', { operationType: 'deleted', error })
      );
    },
  });

  next();
};

exports.register.attributes = {
  name: 'nagbot',
  version: '0.0.1',
};
