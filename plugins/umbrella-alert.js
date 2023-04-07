'use strict';

// const wreck = require('wreck').defaults({ json: true });
const parser = require('xml2json');
const cache = require('../cache.js');

// the number of forecasts to consider; users generally don't care about whether an umbrella is
// needed more than 12 hours in the future
const FORECAST_RELEVANCE = 12;
const DEPRESSION_FACTOR = 5; // if there's rain soon then later rain is less important by a factor
const INITIAL_IMPORTANCE = 50; // if it will rain heavily in the next hour, how important is that
const HIGH_RAIN_THRESHOLD = 80; // what percent chance of rain is "a lot" of rain in 1 hour

const register = (server, options) => {
  server.route({
    method: 'GET',
    path: '/plugins/umbrella-alert',
    handler: (request, h) => {
      const stationId = process.env.WEATHER_STATION_ID;
      const url = `https://dd.weather.gc.ca/citypage_weather/xml/ON/${stationId}.xml`;
      return cache.get(url).then((payload) => {
        const json = parser.toJson(payload, { object: true });
        const weatherData = json.siteData;
        const forecasts = weatherData.forecastGroup.forecast;
        const hourlyForecasts = weatherData.hourlyForecastGroup.hourlyForecast;
        const response = {
          priority: 0,
          type: 'umbrella-alert',
          data: { message: forecasts[0].textSummary },
        };

        const precip = hourlyForecasts.map(
          (forecast) => ({ percentage: forecast.lop.$t, time: forecast.dateTimeUTC }),
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
      }).catch((err) => ({
        priority: 60,
        type: 'umbrella-alert',
        data: {
          error: err,
          message: 'Could not fetch data',
        },
      }));
    },
  });
};

exports.plugin = {
  name: 'umbrellaAlert',
  version: '0.0.1',
  register,
};
