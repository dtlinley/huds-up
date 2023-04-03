'use strict';

// const wreck = require('wreck').defaults({ json: true });
const cache = require('../cache.js');
const parser = require('xml2json');

const IDEAL_TEMP_MAX = 25;
const IDEAL_TEMP_MIN = 20;
const LARGE_TEMPERATURE_DIFFERENCE = 50;
const MAX_PRIORITY = 80;

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/temperature-trend',
    handler: (request, reply) => {
      const stationId = process.env.WEATHER_STATION_ID;
      const url = `https://dd.weather.gc.ca/citypage_weather/xml/ON/${stationId}.xml`;
      return cache.get(url).then((payload) => {
        const json = parser.toJson(payload, { object: true });
        const weatherData = json.siteData;
        const hourlyForecasts = weatherData.hourlyForecastGroup.hourlyForecast;
        const forecasts = weatherData.forecastGroup.forecast;

        const forecastHigh = parseInt(
          forecasts.find(f => f.temperatures.temperature.class === 'high')
            .temperatures.temperature.$t
        , 10);
        const forecastLow = parseInt(
          forecasts.find(f => f.temperatures.temperature.class === 'low')
            .temperatures.temperature.$t
        , 10);
        const response = {
          priority: 0,
          type: 'temperature-trend',
          data: {
            message: forecasts[0].textSummary,
            maxTemp: forecastHigh,
            minTemp: forecastLow,
          },
        };


        const temps = hourlyForecasts.map(
          forecast => ({ temperature: forecast.temperature.$t, time: forecast.dateTimeUTC })
        );
        response.data.temperatures = temps;
        response.data.currentTemp = temps[0].temperature;

        const idealMinDiff = Math.abs(forecastLow - IDEAL_TEMP_MIN);
        const idealMaxDiff = Math.abs(forecastHigh - IDEAL_TEMP_MAX);
        const unpleasantness =
          Math.min(1, (idealMinDiff + idealMaxDiff) / (2 * LARGE_TEMPERATURE_DIFFERENCE));

        response.priority = Math.max(5, unpleasantness * MAX_PRIORITY);

        return reply(response);
      }).catch((err) => {
        reply({
          priority: 60,
          type: 'temperature-trend',
          data: {
            error: err,
            message: 'Could not fetch data',
          },
        });
      });
    },
  });

  next();
};

exports.register.attributes = {
  name: 'temperatureTrend',
  version: '0.0.1',
};
