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
        wreck,
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
          expect(JSON.parse(response.payload).priority).to.equal(0);
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
          expect(JSON.parse(response.payload).priority).to.equal(0);
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
          'api.openweathermap.org/data/2.5/forecast?id=1234&APPID=foobarapikey'
        )).to.be.true;
      });
    });

    describe('when there is a large amount of rain expected in the next three hours', () => {
      it('should respond with a high priority message');
    });

    describe('when there is no rain expected within the next twelve hours', () => {
      it('should respond with a low priority message');
    });

    describe('when there is rain expected in the near future', () => {
      it('should respond with a higher priority message than if rain isn\'t expected soon');
    });

    describe('when there is some rain expected in the near future', () => {
      it('should respond with a medium priority message');
    });

    describe('when some rain is expected soon, then lots of rain later', () => {
      it('should respond with a higher priority message than if no rain is expected soon, then lots of rain later'); // eslint-disable-line max-len
    });
  });
});
