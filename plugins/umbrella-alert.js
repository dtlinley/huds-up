'use strict';

const cache = require('../cache');

// the number of forecasts to consider; users generally don't care about whether an umbrella is
// needed more than 12 hours in the future
const FORECAST_RELEVANCE = 12;
const DEPRESSION_FACTOR = 5; // if there's rain soon then later rain is less important by a factor
const INITIAL_IMPORTANCE = 50; // if it will rain heavily in the next hour, how important is that
const HIGH_RAIN_THRESHOLD = 80; // what percent chance of rain is "a lot" of rain in 1 hour

const register = (server) => {
  server.route({
    method: 'GET',
    path: '/plugins/umbrella-alert',
    handler: async () => {
      const stationId = process.env.WEATHER_STATION_ID;
      const url = `https://weather.gc.ca/api/app/v3/en/Location/43.960,-78.296?type=city`;
      const payload = await cache.get(url)
      const data = payload[0]
      const dailyForecasts = data.dailyFcst.daily;
      const hourlyForecasts = data.hourlyFcst.hourly;
      const response = {
        priority: 0,
        type: 'umbrella-alert',
        data: { message: dailyForecasts[0].summary },
      };

      const precip = hourlyForecasts.map(
        (forecast) => {
          const date = new Date(forecast.epochTime * 1000)
          let dateString = date.toLocaleTimeString();
          if (date.getHours() === 0) {
            dateString = date.toDateString();
          }
          return{ percentage: parseInt(forecast.precip, 10), time: dateString }
        },
      );
      response.data.rain = precip;

      const importance = (data, max, depression) => {
        if (data.length <= 0 || max <= 0) {
          return 0;
        }

        const amount = Math.min(data[0].percentage / HIGH_RAIN_THRESHOLD, 1);
        const current = (amount * max) / depression;
        const nextMax = max - (INITIAL_IMPORTANCE / FORECAST_RELEVANCE);
        const nextDepression = ((amount * (DEPRESSION_FACTOR - 1)) + 1) * depression;
        return current + importance(data.slice(1), nextMax, nextDepression);
      };

      const priority = importance(response.data.rain, INITIAL_IMPORTANCE, 1);
      if (priority < 2) {
        response.priority = 2;
      } else {
        response.priority = priority;
      }
      return response;
    },
  });
};

exports.plugin = {
  name: 'umbrellaAlert',
  version: '0.0.1',
  register,
};
