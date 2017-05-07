'use strict';

const wreck = require('wreck').defaults({ json: true });

// the number of forecasts to consider; users generally don't care about whether an umbrella is
// needed more than 12 hours in the future
const FORECAST_RELEVANCE = 12;
const DEPRESSION_FACTOR = 5; // if there's rain soon then later rain is less important by a factor
const INITIAL_IMPORTANCE = 50; // if it will rain heavily in the next hour, how important is that
const HIGH_RAIN_THRESHOLD = 0.05; // how many mm of rain are considered "a lot" of rain in 1 hour

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/umbrella-alert',
    handler: (request, reply) => {
      const cityLatLong = process.env.WEATHER_CITY_COORDS;
      const apiKey = process.env.DARKSKY_API_KEY;
      if (!cityLatLong || !apiKey) {
        const response = { priority: 0, type: 'umbrella-alert', data: {} };

        return reply(response);
      }

      const apiBase = 'https://api.darksky.net/forecast';
      const url = `${apiBase}/${apiKey}/${cityLatLong}`;
      return wreck.get(url, (err, res, payload) => {
        if (err) {
          return reply({
            priority: 60,
            type: 'umbrella-alert',
            data: {
              error: err,
              message: 'Could not fetch data',
            },
          });
        }

        const response = {
          priority: 0,
          type: 'umbrella-alert',
          data: { message: payload.hourly.summary },
        };
        const rain = payload.hourly.data
        .map(forecast => {
          let mm = 0;
          if (forecast.precipIntensity) {
            mm = forecast.precipIntensity;
          }
          return { mm, time: forecast.time };
        });
        response.data.rain = rain;

        const importance = (data, max, depression) => {
          if (data.length <= 0 || max <= 0) {
            return 0;
          }

          const amount = Math.min(data[0].mm / HIGH_RAIN_THRESHOLD, 1);
          const current = (amount * max) / depression;
          const nextMax = max - (INITIAL_IMPORTANCE / FORECAST_RELEVANCE);
          const nextDepression = ((amount * (DEPRESSION_FACTOR - 1)) + 1) * depression;
          return current + importance(data.slice(1), nextMax, nextDepression);
        };

        const priority = importance(rain, INITIAL_IMPORTANCE, 1);
        if (priority < 2) {
          response.priority = 2;
        } else {
          response.priority = priority;
        }
        return reply(response);
      });
    },
  });

  next();
};

exports.register.attributes = {
  name: 'umbrellaAlert',
  version: '0.0.1',
};
