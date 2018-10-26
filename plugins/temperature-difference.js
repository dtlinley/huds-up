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

const cache = require('../cache.js');

const EVENING_HOUR = 16;
const IDEAL_TEMP_MAX = 25;
const IDEAL_TEMP_MIN = 20;
const LARGE_TEMPERATURE_DIFFERENCE = 10;
const MAX_PRIORITY = 80;

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

      let prior = Promise.resolve({});
      if ((new Date()).getHours() < EVENING_HOUR) {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        const start = Math.floor(date.getTime() / 1000);
        const path = `https://api.darksky.net/forecast/${apiKey}/${cityLatLong},${start}?units=ca`;

        prior = cache.get(path).then((payload) => payload.daily.data[0]);
      }

      const forecastPath = `https://api.darksky.net/forecast/${apiKey}/${cityLatLong}?units=ca`;
      const forecast = cache.get(forecastPath).then((payload) => payload.daily.data);

      return Promise.all([prior, forecast]).then((values) => {
        const priorData = values[0];
        const forecastData = values[1];
        let current = forecastData[0];
        let upcoming = forecastData[1];

        if ((new Date()).getHours() < EVENING_HOUR) {
          current = priorData;
          upcoming = forecastData[0];
        }

        response.data.current = current;
        response.data.next = upcoming;

        if (!current || !upcoming) {
          response.data.message = 'Missing data for forecasts';
          return reply(response);
        }

        const minTempDiff =
          upcoming.apparentTemperatureMin - current.apparentTemperatureMin;
        const maxTempDiff =
          upcoming.apparentTemperatureMax - current.apparentTemperatureMax;
        const delta = Math.min(
          1,
          (Math.abs(minTempDiff) + Math.abs(maxTempDiff)) / LARGE_TEMPERATURE_DIFFERENCE
        );
        response.data.averageTemperatureDifference = (minTempDiff + maxTempDiff) / 2;

        const idealMinDiff = Math.abs(upcoming.apparentTemperatureMin - IDEAL_TEMP_MIN);
        const idealMaxDiff = Math.abs(upcoming.apparentTemperatureMax - IDEAL_TEMP_MAX);
        const unpleasantness =
          Math.min(1, (idealMinDiff + idealMaxDiff) / (2 * LARGE_TEMPERATURE_DIFFERENCE));

        response.priority = Math.max(5, delta * unpleasantness * MAX_PRIORITY);
        return reply(response);
      }, (error) => reply({
        priority: 60,
        type: 'temperature-difference',
        data: {
          error,
          message: 'Could not fetch data',
        },
      }));
    },
  });

  next();
};

exports.register.attributes = {
  name: 'temperatureDifference',
  version: '0.0.1',
};
