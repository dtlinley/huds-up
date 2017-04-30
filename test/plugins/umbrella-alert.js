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
  let wreck;
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

      wreck = {
        get: sinon.stub(),
      };
      const plugin = proxyquire('../../plugins/umbrella-alert', {
        wreck: {
          defaults: () => wreck,
        },
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
        expect(wreck.get.called).to.be.false;
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
        expect(wreck.get.called).to.be.false;
      });
    });

    describe('fetching rain data', () => {
      it('should make an API call to the weather service', () => {
        server.inject(query);
        expect(wreck.get.calledWithMatch(
          'https://api.darksky.net/forecast/foobarapikey/12,-34'
        )).to.be.true;
      });
    });

    describe('when the API call fails', () => {
      beforeEach(() => {
        wreck.get.yields('Uh oh, something went wrong');
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
        wreck.get.yields(null, null, data);
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
              { precipIntensity: 3.0 },
              { precipIntensity: 3.0 },
              { precipIntensity: 3.0 },
              { precipIntensity: 3.0 },
              { precipIntensity: 3.0 },
              { precipIntensity: 3.0 },
              { precipIntensity: 3.0 },
              { precipIntensity: 3.0 },
              { precipIntensity: 3.0 },
              { precipIntensity: 3.0 },
              { precipIntensity: 3.0 },
              { precipIntensity: 3.0 },
            ],
          },
        };
        wreck.get.yields(null, null, data);
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
              { precipIntensity: 0 },
              { precipIntensity: 0 },
              { precipIntensity: 0 },
              { precipIntensity: 0 },
              { precipIntensity: 0 },
              { precipIntensity: 0 },
              { precipIntensity: 0 },
              { precipIntensity: 0 },
              { precipIntensity: 0 },
              { precipIntensity: 0 },
              { precipIntensity: 0 },
              { precipIntensity: 0 },
            ],
          },
        };
        wreck.get.yields(null, null, data);
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
              { precipIntensity: 1.0 },
              { precipIntensity: 0.5 },
              { precipIntensity: 0.75 },
              { precipIntensity: 1.0 },
              { precipIntensity: 0 },
              { precipIntensity: 1.0 },
              { precipIntensity: 0 },
              { precipIntensity: 2.0 },
              { precipIntensity: 0 },
              { precipIntensity: 0 },
              { precipIntensity: 0 },
              { precipIntensity: 0 },
            ],
          },
        };
        wreck.get.yields(null, null, data);
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
              { precipIntensity: 1.0 },
              { precipIntensity: 0 },
              { precipIntensity: 1.0 },
              { precipIntensity: 1.0 },
              { precipIntensity: 1.0 },
              { precipIntensity: 1.0 },
              { precipIntensity: 4.0 },
              { precipIntensity: 6.0 },
              { precipIntensity: 7.0 },
              { precipIntensity: 6.0 },
              { precipIntensity: 6.0 },
              { precipIntensity: 6.0 },
            ],
          },
        };
        wreck.get.yields(null, null, data);
      });

      it('should respond with a higher priority message than if no rain is expected soon, then lots of rain later', done => { // eslint-disable-line max-len
        const altData = {
          hourly: {
            data: [
              { precipIntensity: 0 },
              { precipIntensity: 0 },
              { precipIntensity: 0 },
              { precipIntensity: 0 },
              { precipIntensity: 0 },
              { precipIntensity: 0 },
              { precipIntensity: 4.0 },
              { precipIntensity: 6.0 },
              { precipIntensity: 7.0 },
              { precipIntensity: 6.0 },
              { precipIntensity: 6.0 },
              { precipIntensity: 6.0 },
            ],
          },
        };
        wreck.get.yields(null, null, altData);
        server.inject(query).then(altResponse => {
          wreck.get.yields(null, null, data);
          server.inject(query).then(response => {
            expect(response.result.priority).to.be.above(altResponse.result.priority);
            done();
          });
        });
      });
    });
  });
});
