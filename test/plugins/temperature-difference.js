'use strict';

const expect = require('chai').expect;
const Hapi = require('hapi');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('temperatureDifference Plugin', () => {
  let query;
  let server;
  let wreck;
  let WEATHER_CITY_ID;
  let OPEN_WEATHER_MAP_API_KEY;

  beforeEach(() => {
    WEATHER_CITY_ID = process.env.WEATHER_CITY_ID;
    OPEN_WEATHER_MAP_API_KEY = process.env.OPEN_WEATHER_MAP_API_KEY;
    process.env.WEATHER_CITY_ID = 1234;
    process.env.OPEN_WEATHER_MAP_API_KEY = 'foobarapikey';

    query = '/plugins/temperature-difference';

    server = new Hapi.Server();
    server.connection({});

    wreck = {
      get: sinon.stub(),
    };

    const plugin = proxyquire('../../plugins/temperature-difference', {
      wreck: {
        defaults: () => wreck,
      },
    });

    server.register(plugin);

    wreck.get
    .withArgs('http://api.openweathermap.org/data/2.5/forecast?id=1234&APPID=foobarapikey')
    .yields(null, null);
  });

  afterEach(() => {
    process.env.WEATHER_CITY_ID = WEATHER_CITY_ID;
    process.env.OPEN_WEATHER_MAP_API_KEY = OPEN_WEATHER_MAP_API_KEY;
  });

  describe('#GET /plugins/temperature-difference', () => {
    it('should return a priority 0 payload', done => {
      server.inject(query).then(response => {
        expect(response.result.priority).to.equal(0);
        done();
      });
    });

    it('should get weather forecast for the next couple of days');

    it('should get get historical weather data from the past day');

    describe('in the evening or later', () => {
      it('should compare tomorrow\'s forecast to what happend today');
    });

    describe('before the evening', () => {
      it('should compare today\'s forecast to what happened yesterday');
    });
  });
});
