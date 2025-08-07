'use strict';

/**
 * Air Quality
 */

const cache = require('../cache');

const IDEAL_TEMP_MAX = 25;
const IDEAL_TEMP_MIN = 20;
const LARGE_TEMPERATURE_DIFFERENCE = 10;
const MAX_PRIORITY = 80;

const register = (server) => {
  server.route({
    method: 'GET',
    path: '/plugins/air-quality',
    handler: async () => {
      const response = { priority: 0, type: 'air-quality', data: {} };

      const url = `https://weather.gc.ca/api/app/v3/en/Location/43.960,-78.296?type=city`;

      const payload = await cache.get(url)
      const data = payload[0]

      const quality = data?.aqhi
      response.data.message = quality?.riskText
      response.data.qualityRating = quality?.aqhiVal

      response.priority = quality?.aqhiVal * 10
      if (quality?.aqhiVal <= 2) {
        response.priority = 0
      }

      return response;
    },
  });
};

exports.plugin = {
  name: 'airQuality',
  version: '0.0.1',
  register,
};
