'use strict';

const wreck = require('wreck').defaults({ json: true });

const cached = {};

module.exports = {
  get: (url) => {
    if (cached[url]) {
      console.log(`${url} loaded from cache`); // eslint-disable-line no-console
      return cached[url];
    }

    cached[url] = new Promise((resolve, reject) => {
      const headers = {
        'User-Agent': 'curl/7.58.0',
        Accept: '*/*',
      };
      wreck.get(url, { headers }, (err, res, payload) => {
        if (err) {
          console.log(`${url} returned error: ${err}`); // eslint-disable-line no-console
          return reject(err);
        } else if (res.statusCode !== 200) {
          console.log(`${url} returned non-200 status code ${res.statusCode}`); // eslint-disable-line
          return reject(`${res.statusCode} - ${res.statusMessage}`);
        }

        console.log(`${url} loaded and cached`); // eslint-disable-line no-console
        return resolve(payload);
      });
    });

    setTimeout(() => {
      delete cached[url];
    }, process.env.CACHE_EXPIRY_MS);

    return cached[url];
  },
};
