'use strict';

const wreck = require('wreck').defaults({ json: true });

const MAX_PRIORITY = 80;
const LARGE_TEMPERATURE_DIFFERENCE = 30;
const IDEAL_TEMP_MIN = 20;
const IDEAL_TEMP_MAX = 30;
const EVENING_HOUR = 18;

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/temperature-difference',
    handler: (request, reply) => {
      const cityLatLong = process.env.WEATHER_CITY_COORDS;
      const apiKey = process.env.DARKSKY_API_KEY;
      if (!cityLatLong || !apiKey) {
        const response = { priority: 0, type: 'umbrella-alert', data: {} };

        return reply(response);
      }

      const response = { priority: 0, type: 'temperature-difference', data: {} };
      const date = new Date();
      date.setDate(date.getDate() - 1);
      const start = Math.floor(date.getTime() / 1000);
      const forecast = `https://api.darksky.net/forecast/${apiKey}/${cityLatLong},${start}&units=ca`;

      return wreck.get(forecast, (err, res, payload) => {
        if (err) {
          return reply({
            priority: 60,
            type: 'temperature-difference',
            data: {
              error: err,
              message: 'Could not fetch data',
            },
          });
        }
        let current = payload.daily.data[0];
        let upcoming = payload.daily.data[1];

        if ((new Date()).getHours() >= EVENING_HOUR) {
          current = payload.daily.data[1];
          upcoming = payload.daily.data[2];
        }

        response.data.current = current;
        response.data.next = upcoming;
        const minTempDiff =
          Math.abs(current.apparentTemperatureMin - upcoming.apparentTemperatureMin);
        const maxTempDiff =
          Math.abs(current.apparentTemperatureMax - upcoming.apparentTemperatureMax);
        const delta = Math.min(1, (minTempDiff + maxTempDiff) / LARGE_TEMPERATURE_DIFFERENCE);

        const idealMinDiff = Math.abs(upcoming.apparentTemperatureMin - IDEAL_TEMP_MIN);
        const idealMaxDiff = Math.abs(upcoming.apparentTemperatureMax - IDEAL_TEMP_MAX);
        const unpleasantness =
          Math.min(1, (idealMinDiff + idealMaxDiff) / LARGE_TEMPERATURE_DIFFERENCE);

        response.priority = Math.max(5, delta * unpleasantness * MAX_PRIORITY);
        return reply(response);
      });
    },
  });

  next();
};

exports.register.attributes = {
  name: 'temperatureDifference',
  version: '0.0.1',
};
