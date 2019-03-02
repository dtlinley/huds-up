'use strict';

const expect = require('chai').expect;
const Hapi = require('hapi');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('Umbrella Alert Plugin', () => {
  let WEATHER_CITY_COORDS;
  let DARKSKY_API_KEY;
  let query;
  let server;
  let cache;
  let data;

  beforeEach(done => {
    WEATHER_CITY_COORDS = process.env.WEATHER_CITY_COORDS;
    DARKSKY_API_KEY = process.env.DARKSKY_API_KEY;
    query = '/plugins/umbrella-alert';

    server = new Hapi.Server();
    server.connection({});

    server.start((err) => {
      if (err) {
        throw err;
      }

      cache = {
        get: sinon.stub(),
      };
      const plugin = proxyquire('../../plugins/umbrella-alert', {
        '../cache.js': cache,
      });

      server.register(plugin);

      done();
    });
  });

  afterEach(done => {
    process.env.WEATHER_CITY_COORDS = WEATHER_CITY_COORDS;
    process.env.DARKSKY_API_KEY = DARKSKY_API_KEY;
    server.stop({}, done);
  });

  describe('#GET /plugins/umbrella-alert', () => {
    beforeEach(() => {
      process.env.WEATHER_CITY_COORDS = '12,-34';
      process.env.DARKSKY_API_KEY = 'foobarapikey';
    });

    describe('when no city ID has been configured', () => {
      beforeEach(() => {
        process.env.WEATHER_CITY_COORDS = '';
      });

      it('should respond with a 0 priority message', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.equal(0);
          done();
        });
      });

      it('should not attempt to fetch weather data', () => {
        server.inject(query);
        expect(cache.get.called).to.be.false;
      });
    });

    describe('when no weather API key has been configured', () => {
      beforeEach(() => {
        process.env.DARKSKY_API_KEY = '';
      });

      it('should respond with a 0 priority message', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.equal(0);
          done();
        });
      });

      it('should not attempt to fetch weather data', () => {
        server.inject(query);
        expect(cache.get.called).to.be.false;
      });
    });

    describe('fetching rain data', () => {
      it('should make an API call to the weather service', () => {
        cache.get.returns(Promise.reject('foobar'));
        server.inject(query);
        expect(cache.get.calledWithMatch(
          'https://api.darksky.net/forecast/foobarapikey/12,-34'
        )).to.be.true;
      });
    });

    describe('when the API call fails', () => {
      beforeEach(() => {
        cache.get.returns(Promise.reject('Uh oh, something went wrong'));
      });

      it('should respond with a high priority message', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.be.above(50);
          done();
        });
      });
    });

    describe('when the API call succeeds', () => {
      beforeEach(() => {
        data = {
          hourly: {
            summary: 'Tut tut, it looks like precipitation',
            data: [],
          },
        };
        cache.get.returns(Promise.resolve(data));
      });

      it('should respond with the summary for today', done => {
        server.inject(query).then(response => {
          expect(response.result.data.message).to.equal('Tut tut, it looks like precipitation');
          done();
        });
      });
    });

    describe('when there is a large amount of rain expected in the next three hours', () => {
      beforeEach(() => {
        data = {
          hourly: {
            data: [
              { precipIntensity: 3.0, precipType: 'rain' },
              { precipIntensity: 3.0, precipType: 'rain' },
              { precipIntensity: 3.0, precipType: 'rain' },
              { precipIntensity: 3.0, precipType: 'rain' },
              { precipIntensity: 3.0, precipType: 'rain' },
              { precipIntensity: 3.0, precipType: 'rain' },
              { precipIntensity: 3.0, precipType: 'rain' },
              { precipIntensity: 3.0, precipType: 'rain' },
              { precipIntensity: 3.0, precipType: 'rain' },
              { precipIntensity: 3.0, precipType: 'rain' },
              { precipIntensity: 3.0, precipType: 'rain' },
              { precipIntensity: 3.0, precipType: 'rain' },
            ],
          },
        };
        cache.get.returns(Promise.resolve(data));
      });

      it('should respond with a high priority message', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.be.above(50);
          done();
        });
      });

      it('should always be below 90, since rain is rarely life-threatening', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.be.below(90);
          done();
        });
      });
    });

    describe('when there is no rain expected within the next twelve hours', () => {
      beforeEach(() => {
        data = {
          hourly: {
            data: [
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
            ],
          },
        };
        cache.get.returns(Promise.resolve(data));
      });

      it('should respond with a low priority message', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.be.below(10);
          done();
        });
      });

      it('should respond with a priority above zero, noting that no umbrella is needed', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.be.above(0);
          done();
        });
      });
    });

    describe('when there is some rain expected in the near future', () => {
      beforeEach(() => {
        data = {
          hourly: {
            data: [
              { precipIntensity: 0.006, precipType: 'rain' },
              { precipIntensity: 0.001, precipType: 'rain' },
              { precipIntensity: 0.006, precipType: 'rain' },
              { precipIntensity: 0.01, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0.01, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0.02, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
            ],
          },
        };
        cache.get.returns(Promise.resolve(data));
      });

      it('should respond with a higher priority message than if rain isn\'t expected', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.be.above(10);
          done();
        });
      });

      it('should respond with a medium priority message', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.be.below(50);
          done();
        });
      });
    });

    describe('when some rain is expected soon, then lots of rain later', () => {
      beforeEach(() => {
        data = {
          hourly: {
            data: [
              { precipIntensity: 0.05, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0.05, precipType: 'rain' },
              { precipIntensity: 0.05, precipType: 'rain' },
              { precipIntensity: 0.05, precipType: 'rain' },
              { precipIntensity: 0.05, precipType: 'rain' },
              { precipIntensity: 0.1, precipType: 'rain' },
              { precipIntensity: 0.2, precipType: 'rain' },
              { precipIntensity: 0.3, precipType: 'rain' },
              { precipIntensity: 0.2, precipType: 'rain' },
              { precipIntensity: 0.2, precipType: 'rain' },
              { precipIntensity: 0.2, precipType: 'rain' },
            ],
          },
        };
        cache.get.returns(Promise.resolve(data));
      });

      it('should respond with a higher priority message than if no rain is expected soon, then lots of rain later', done => { // eslint-disable-line max-len
        const altData = {
          hourly: {
            data: [
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0, precipType: 'rain' },
              { precipIntensity: 0.1, precipType: 'rain' },
              { precipIntensity: 0.2, precipType: 'rain' },
              { precipIntensity: 0.5, precipType: 'rain' },
              { precipIntensity: 0.2, precipType: 'rain' },
              { precipIntensity: 0.2, precipType: 'rain' },
              { precipIntensity: 0.2, precipType: 'rain' },
            ],
          },
        };
        cache.get.returns(Promise.resolve(altData));
        server.inject(query).then(altResponse => {
          cache.get.returns(Promise.resolve(data));
          server.inject(query).then(response => {
            expect(response.result.priority).to.be.above(altResponse.result.priority);
            done();
          });
        });
      });
    });

    describe('when there is snow expected in the future', () => {
      it('should return snow data');

      it('should return a low priority');
    });
  });
});
