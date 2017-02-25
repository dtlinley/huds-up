'use strict';

const wreck = require('wreck').defaults({ json: true });

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/temperature-difference',
    handler: (request, reply) => {
      const response = { priority: 0, type: 'temperature-difference', data: {} };
      const forecast = `http://api.openweathermap.org/data/2.5/forecast?id=${process.env.WEATHER_CITY_ID}&APPID=${process.env.OPEN_WEATHER_MAP_API_KEY}`;
      const start = (new Date()).setHours(0, 0, 0, 0);
      const history = `http://api.openweathermap.org/data/2.5/history/city?id=${process.env.WEATHER_CITY_ID}&APPID=${process.env.OPEN_WEATHER_MAP_API_KEY}&type=hour&start=${start}`;

      const forecastPromise = new Promise((resolve) => {
        wreck.get(forecast, (err, res, payload) => {
          debugger;
          resolve();
        });
      });
      const historyPromise = new Promise((resolve) => {
        wreck.get(history, (err, res, payload) => {
          debugger;
          console.log(payload);
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
