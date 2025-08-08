'use strict';

const parser = require('xml2json');
const cache = require('../cache');

const IDEAL_TEMP_MAX = 25;
const IDEAL_TEMP_MIN = 20;
const LARGE_TEMPERATURE_DIFFERENCE = 50;
const MAX_PRIORITY = 80;

const register = (server) => {
  server.route({
    method: 'GET',
    path: '/plugins/temperature-trend',
    handler: async () => {
      const stationId = process.env.WEATHER_STATION_ID;
      const url = `https://weather.gc.ca/api/app/v3/en/Location/43.960,-78.296?type=city`;
      const payload = await cache.get(url);
      const data = payload[0];
      const hourlyForecasts = data.hourlyFcst.hourly;
      const dailyForecasts = data.dailyFcst.daily;

      let forecastLow = NaN;
      let forecastHigh = NaN;
      hourlyForecasts.forEach((forecast) => {
        const temperature = parseInt(forecast.temperature.metric, 10);

        if (Number.isNaN(forecastLow) || temperature < forecastLow) {
          forecastLow = temperature;
        }

        if (Number.isNaN(forecastHigh) || temperature > forecastHigh) {
          forecastHigh = temperature;
        }
      });

      const response = {
        priority: 0,
        type: 'temperature-trend',
        data: {
          message: dailyForecasts[0].summary,
          maxTemp: forecastHigh,
          minTemp: forecastLow,
        },
      };

      const feelsLikeTemps = hourlyForecasts.map(
        (forecast) => {
          const tempReading = {
            temperature: forecast.temperature.metric,
            time: forecast.epochTime,
          };
          if (forecast.feelsLike.metric) {
            tempReading.temperature = forecast.feelsLike.metric;
          }
          tempReading.temperature = parseInt(tempReading.temperature, 10);
          return tempReading;
        },
      );
      response.data.feelsLikeTemps = feelsLikeTemps;

      const realTemps = hourlyForecasts.map(
        (forecast) => {
          const tempReading = {
            temperature: forecast.temperature.metric,
            time: forecast.epochTime,
          };
          tempReading.temperature = parseInt(tempReading.temperature, 10);
          return tempReading;
        },
      );
      response.data.realTemps = realTemps;

      const yesterdayTemps = data.pastHourly.hours.map(
        (forecast) => {
          const tempReading = {
            temperature: forecast.temperature,
            time: forecast.timeStamp,
          };
          return tempReading;
        },
      );
      response.data.yesterdayTemps = yesterdayTemps;

      response.data.currentTemp = realTemps[0].temperature;

      const idealMinDiff = Math.abs(forecastLow - IDEAL_TEMP_MIN);
      const idealMaxDiff = Math.abs(forecastHigh - IDEAL_TEMP_MAX);
      const unpleasantness = Math.min(1, (idealMinDiff + idealMaxDiff)
        / (2 * LARGE_TEMPERATURE_DIFFERENCE));

      response.priority = Math.max(5, unpleasantness * MAX_PRIORITY);

      return response;
    },
  });
};

exports.plugin = {
  name: 'temperatureTrend',
  version: '0.0.1',
  register,
};
