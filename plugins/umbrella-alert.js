'use strict';

const wreck = require('wreck').defaults({ json: true });

// the number of forecasts to consider; users generally don't care about whether an umbrella is
// needed more than 12 hours in the future
const FORECAST_RELEVANCE = 4;
const DEPRESSION_FACTOR = 2.5; // if there's rain soon then later rain is less important by a factor
const INITIAL_IMPORTANCE = 50; // if it will rain heavily in the next 3 hours, how important is that
const HIGH_RAIN_THRESHOLD = 20; // how many mm of rain are considered "a lot" of rain

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

      const apiBase = 'http://api.openweathermap.org/data/2.5/forecast';
      const url = `${apiBase}?id=${cityId}&APPID=${apiKey}`;
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

        const response = { priority: 0, type: 'umbrella-alert', data: { city: payload.city } };
        const rain = payload.list
        .map(forecast => {
          let mm = 0;
          if (forecast.rain && forecast.rain['3h']) {
            mm = forecast.rain['3h'];
          }
          return { mm, time: forecast.dt };
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
        if (priority <= 0) {
          response.priority = 2;
          response.data.message = 'Skies are clear';
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
