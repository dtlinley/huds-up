'use strict';

const wreck = require('wreck');

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/umbrella-alert',
    handler: (request, reply) => {
      const cityId = process.env.WEATHER_CITY_ID;
      const apiKey = process.env.OPEN_WEATHER_MAP_API_KEY;
      if (!cityId || !apiKey) {
        const response = { priority: 0, type: 'umbrella-alert', data: {} };

        return reply(response);
      }

      const apiBase = 'api.openweathermap.org/data/2.5/forecast';
      const url = `${apiBase}?id=${cityId}&APPID=${apiKey}`;
      return wreck.get(url, () => {
        reply({});
      });
    },
  });

  next();
};

exports.register.attributes = {
  name: 'umbrellaAlert',
  version: '0.0.1',
};
