'use strict';

const wreck = require('wreck').defaults({ json: true });

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/temperature-difference',
    handler: (request, reply) => {
      const response = { priority: 0, type: 'temperature-difference', data: {} };
      const forecast = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${process.env.WEATHER_CITY_COORDS}`;
      const start = (new Date()).setHours(0, 0, 0, 0);
      const history = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${process.env.WEATHER_CITY_COORDS},${start}`;

      const forecastPromise = new Promise((resolve) => {
        wreck.get(forecast, () => {
          resolve();
        });
      });
      const historyPromise = new Promise((resolve) => {
        wreck.get(history, () => {
          resolve();
        });
      });

      Promise.all([forecastPromise, historyPromise]).then(() => {
        reply(response);
      });
    },
  });

  next();
};

exports.register.attributes = {
  name: 'temperatureDifference',
  version: '0.0.1',
};
