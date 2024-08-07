'use strict';

/**
 * Temperature Difference
 *
 * At-a-glance information about the temperature for the coming day as compared to the previous day.
 * If the temperature will be significantly different from the previous day, the user will be
 * alerted; the priority of the response also depends on whether the outside temperature is becoming
 * more or less pleasant.
 * Early in the day, the user is assumed to be interested in how yesterday's temperature differs
 * from the forecasted temperature of the coming day. Later in the day, it is assumed the user is
 * more interested in how tomorrow will compare to the day that is now finishing.
 *
 * EVENING_HOUR: The hour of the day (0-23) at which this plugin should start showing the forecast
 * for the next day rather than for the rest of the current day
 * IDEAL_TEMP_MAX/MIN: The range of temperatures that are desired for optimal comfort outside.
 * LARGE_TEMPERATURE_DIFFERENCE: The total difference in temperature after which more change doesn't
 * affect the priority; this is split between the difference for both max and min temperatures, so
 * if tomorrow will be 15 degrees warmer at both the minimum and maximum than today, the total diff
 * will be 30
 * MAX_PRIORITY: The highest priority that this plugin should be able to produce. If tomorrow's temp
 * will be significantly less comfortable than today's, this will be the priority returned.
 */

const parser = require('xml2json');
const cache = require('../cache');

const IDEAL_TEMP_MAX = 25;
const IDEAL_TEMP_MIN = 20;
const LARGE_TEMPERATURE_DIFFERENCE = 10;
const MAX_PRIORITY = 80;

const register = (server) => {
  server.route({
    method: 'GET',
    path: '/plugins/temperature-difference',
    handler: () => {
      const response = { priority: 0, type: 'temperature-difference', data: {} };

      const stationId = process.env.WEATHER_STATION_ID;
      const url = `https://dd.weather.gc.ca/citypage_weather/xml/ON/${stationId}.xml`;

      return cache.get(url).then((payload) => {
        const json = parser.toJson(payload, { object: true });
        const weatherData = json.siteData;
        const hourlyForecasts = weatherData.hourlyForecastGroup.hourlyForecast;
        const forecasts = weatherData.forecastGroup.forecast;
        const yesterday = weatherData.yesterdayConditions;

        if (!yesterday) {
          return response;
        }

        const yesterdayHigh = parseInt(yesterday.temperature.find((t) => t.class === 'high').$t, 10);
        const yesterdayLow = parseInt(yesterday.temperature.find((t) => t.class === 'low').$t, 10);

        let forecastLow = NaN;
        let forecastHigh = NaN;
        hourlyForecasts.forEach((forecast) => {
          const temperature = parseInt(forecast.temperature.$t, 10);

          if (Number.isNaN(forecastLow) || temperature < forecastLow) {
            forecastLow = temperature;
          }

          if (Number.isNaN(forecastHigh) || temperature > forecastHigh) {
            forecastHigh = temperature;
          }
        });

        response.data.message = forecasts[0].textSummary;
        response.data.yesterday = {
          high: yesterdayHigh,
          low: yesterdayLow,
        };
        response.data.forecast = {
          high: forecastHigh,
          low: forecastLow,
        };

        const minTempDiff = forecastLow - yesterdayLow;
        const maxTempDiff = forecastHigh - yesterdayHigh;

        const delta = Math.min(
          1,
          (Math.abs(minTempDiff) + Math.abs(maxTempDiff)) / LARGE_TEMPERATURE_DIFFERENCE,
        );
        response.data.averageTemperatureDifference = (minTempDiff + maxTempDiff) / 2;

        const idealMinDiff = Math.abs(forecastLow - IDEAL_TEMP_MIN);
        const idealMaxDiff = Math.abs(forecastHigh - IDEAL_TEMP_MAX);
        const unpleasantness = Math.min(1, (idealMinDiff + idealMaxDiff)
          / (2 * LARGE_TEMPERATURE_DIFFERENCE));

        response.priority = Math.max(5, delta * unpleasantness * MAX_PRIORITY);
        return response;
      }, (error) => ({
        priority: 60,
        type: 'temperature-difference',
        data: {
          error,
          message: 'Could not fetch data',
        },
      }));
    },
  });
};

exports.plugin = {
  name: 'temperatureDifference',
  version: '0.0.1',
  register,
};
