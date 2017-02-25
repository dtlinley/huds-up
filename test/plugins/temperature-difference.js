'use strict';

const expect = require('chai').expect;
const Hapi = require('hapi');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe.only('temperatureDifference Plugin', () => {
  let query;
  let server;
  let wreck;
  let clock;

  let forecastQuery;
  let today;
  let todayMorning;
  let yesterdayMorning;
  let yesterdayNight;
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

    forecastQuery = wreck.get
    .withArgs('http://api.openweathermap.org/data/2.5/forecast?id=1234&APPID=foobarapikey');

    forecastQuery.yields(null, null);

    today = new Date();
    todayMorning = new Date(today.getTime());
    todayMorning.setHours(0, 0, 0, 0);
    yesterdayMorning = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    yesterdayMorning.setHours(0, 0, 0, 0);
    yesterdayNight = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    yesterdayNight.setHours(23, 59, 59, 999);
  });

  afterEach(() => {
    process.env.WEATHER_CITY_ID = WEATHER_CITY_ID;
    process.env.OPEN_WEATHER_MAP_API_KEY = OPEN_WEATHER_MAP_API_KEY;
  });

  describe('#GET /plugins/temperature-difference', () => {
    it('should get weather forecast for the next couple of days', () => {
      server.inject(query);
      expect(wreck.get.calledWith('http://api.openweathermap.org/data/2.5/forecast?id=1234&APPID=foobarapikey')).to.be.true;
    });

    describe('in the evening or later', () => {
      let historyQuery;

      beforeEach(() => {
        today.setHours(19);
        clock = sinon.useFakeTimers(today.getTime());

        historyQuery = wreck.get
        .withArgs(`http://api.openweathermap.org/data/2.5/history/city?id=1234&APPID=foobarapikey&type=hour&start=${todayMorning.getTime()}`);

        historyQuery.yields(null, null);
      });

      afterEach(() => {
        clock.restore();
      });

      it('should compare tomorrow\'s forecast to what happened today', (done) => {
        server.inject(query).then(() => {
          server.inject(query).then(() => {
            expect(wreck.get.calledWith(`http://api.openweathermap.org/data/2.5/history/city?id=1234&APPID=foobarapikey&type=hour&start=${todayMorning.getTime()}`)).to.be.true;
            done();
          });
        });
      });

      describe('when today was pleasant', () => {
        beforeEach(() => {
          historyQuery.yields(null, null, {
            main: {
              temp_min: 289,
              temp_max: 297,
            },
          });
        });

        describe('and tomorrow will be pleasant again', () => {
          beforeEach(() => {
            forecastQuery.yields();
          });

          it('should respond with a low priority message');
        });

        describe('and tomorrow\'s temperatures will be further from pleasant', () => {
          it('should respond with a medium priority message');

          describe('by a significant amount', () => {
            it('should respond with a high priority message');
          });
        });
      });
    });

    describe('before the evening', () => {
      beforeEach(() => {
        today.setHours(7);
        clock = sinon.useFakeTimers(today.getTime());
      });

      afterEach(() => {
        clock.restore();
      });

      it('should compare today\'s forecast to what happened yesterday');
    });

    describe('when either the weather city ID or weather API key are not set', () => {
      it('should respond with a priority 0 message');
    });
  });
});
