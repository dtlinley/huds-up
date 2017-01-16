'use strict';

const expect = require('chai').expect;
const Hapi = require('hapi');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('Umbrella Alert Plugin', () => {
  let WEATHER_CITY_ID;
  let OPEN_WEATHER_MAP_API_KEY;
  let query;
  let server;
  let wreck;
  let data;

  beforeEach(done => {
    WEATHER_CITY_ID = process.env.WEATHER_CITY_ID;
    OPEN_WEATHER_MAP_API_KEY = process.env.OPEN_WEATHER_MAP_API_KEY;
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
    process.env.WEATHER_CITY_ID = WEATHER_CITY_ID;
    process.env.OPEN_WEATHER_MAP_API_KEY = OPEN_WEATHER_MAP_API_KEY;
    server.stop({}, done);
  });

  describe('#GET /plugins/umbrella-alert', () => {
    beforeEach(() => {
      process.env.WEATHER_CITY_ID = '1234';
      process.env.OPEN_WEATHER_MAP_API_KEY = 'foobarapikey';
    });

    describe('when no city ID has been configured', () => {
      beforeEach(() => {
        process.env.WEATHER_CITY_ID = '';
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
        process.env.OPEN_WEATHER_MAP_API_KEY = '';
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
          'http://api.openweathermap.org/data/2.5/forecast?id=1234&APPID=foobarapikey'
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
          city: {
            name: 'Toronto',
            country: 'CA',
          },
          list: [],
        };
        wreck.get.yields(null, null, data);
      });

      it('should respond with the city name', done => {
        server.inject(query).then(response => {
          expect(response.result.data.city.name).to.equal('Toronto');
          done();
        });
      });
    });

    describe('when there is a large amount of rain expected in the next three hours', () => {
      beforeEach(() => {
        data = {
          list: [
            { rain: { '3h': 30 } },
            { rain: { '3h': 32 } },
            { rain: { '3h': 40 } },
            { rain: { '3h': 30 } },
          ],
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
          list: [
            { rain: { '3h': 0 } },
            { },
            { rain: { '3h': 0 } },
            { rain: { '3h': 0 } },
          ],
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
          list: [
            { rain: { '3h': 1.7 } },
            { rain: { '3h': 3 } },
            { rain: { '3h': 6 } },
            { rain: { '3h': 0 } },
          ],
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
          list: [
            { rain: { '3h': 1.7 } },
            { rain: { '3h': 3 } },
            { rain: { '3h': 33 } },
            { rain: { '3h': 40 } },
          ],
        };
        wreck.get.yields(null, null, data);
      });

      it('should respond with a higher priority message than if no rain is expected soon, then lots of rain later', done => { // eslint-disable-line max-len
        const altData = {
          list: [
            { rain: { '3h': 0 } },
            { rain: { '3h': 0 } },
            { rain: { '3h': 33 } },
            { rain: { '3h': 40 } },
          ],
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
