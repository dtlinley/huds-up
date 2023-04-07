'use strict';

const expect = require('chai').expect;
const Hapi = require('@hapi/hapi');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('temperatureDifference Plugin', () => {
  let query;
  let server;
  let cache;
  let clock;
  let forecastStub;

  let today;
  let WEATHER_CITY_COORDS;
  let DARKSKY_API_KEY;

  beforeEach(() => {
    WEATHER_CITY_COORDS = process.env.WEATHER_CITY_COORDS;
    DARKSKY_API_KEY = process.env.DARKSKY_API_KEY;
    process.env.WEATHER_CITY_COORDS = '12,-34';
    process.env.DARKSKY_API_KEY = 'foobarapikey';

    query = '/plugins/temperature-difference';

    server = new Hapi.Server();
    server.connection({});

    cache = {
      get: sinon.stub(),
    };

    const plugin = proxyquire('../../plugins/temperature-difference', {
      '../cache.js': cache,
    });

    server.register(plugin);

    today = new Date();
    forecastStub = cache.get.withArgs('https://api.darksky.net/forecast/foobarapikey/12,-34?units=ca');
  });

  afterEach(() => {
    process.env.WEATHER_CITY_COORDS = WEATHER_CITY_COORDS;
    process.env.DARKSKY_API_KEY = DARKSKY_API_KEY;
  });

  describe('#GET /plugins/temperature-difference', () => {
    let data;

    beforeEach(() => {
      data = {
        daily: {
          data: [],
        },
      };
      cache.get.returns(Promise.resolve(data));
      forecastStub.returns(Promise.resolve(data));
    });

    it('should get the weather forecast', () => {
      server.inject(query);
      expect(forecastStub.called).to.be.true;
    });

    describe('in the evening or later', () => {
      beforeEach(() => {
        today.setHours(19);
        clock = sinon.useFakeTimers(today.getTime());
      });

      afterEach(() => {
        clock.restore();
      });

      describe('when today was pleasant', () => {
        beforeEach(() => {
          data.daily.data.push({ apparentTemperatureMin: 15, apparentTemperatureMax: 25 });
        });

        describe('and tomorrow will be pleasant again', () => {
          beforeEach(() => {
            data.daily.data.push({ apparentTemperatureMin: 15, apparentTemperatureMax: 25 });
          });

          it('should respond with a low priority message', (done) => {
            server.inject(query).then((response) => {
              expect(response.result.priority).to.be.below(20);
              done();
            });
          });
        });

        describe('and tomorrow\'s temperatures will be further from pleasant', () => {
          beforeEach(() => {
            data.daily.data.push({ apparentTemperatureMin: 12, apparentTemperatureMax: 22 });
          });

          it('should respond with a medium priority message', (done) => {
            server.inject(query).then((response) => {
              expect(response.result.priority).to.be.within(15, 50);
              done();
            });
          });

          describe('by a significant amount', () => {
            beforeEach(() => {
              data.daily.data[1] = { apparentTemperatureMin: -5, apparentTemperatureMax: 5 };
            });

            it('should respond with a high priority message', (done) => {
              server.inject(query).then((response) => {
                expect(response.result.priority).to.be.within(50, 90);
                done();
              });
            });
          });
        });
      });

      describe('when today was not pleasant', () => {
        beforeEach(() => {
          data.daily.data.push({ apparentTemperatureMin: 11, apparentTemperatureMax: 16 });
        });

        describe('and tomorrow will be less pleasant', () => {
          beforeEach(() => {
            data.daily.data.push({ apparentTemperatureMin: 8, apparentTemperatureMax: 13 });
          });

          it('should respond with a higher priority than if tomorrow is more pleasant', (done) => {
            server.inject(query).then((lessPleasantResponse) => {
              const unpleasantPriority = lessPleasantResponse.result.priority;
              data.daily.data[1] = { apparentTemperatureMin: 14, apparentTemperatureMax: 19 };
              server.inject(query).then((morePleasantResponse) => {
                const pleasantPriority = morePleasantResponse.result.priority;
                expect(pleasantPriority).to.be.below(unpleasantPriority);
                done();
              });
            });
          });
        });
      });
    });

    describe('before the evening', () => {
      let priorStub;

      beforeEach(() => {
        today.setHours(7);
        clock = sinon.useFakeTimers(today.getTime());

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayTime = Math.floor(yesterday.getTime() / 1000);
        priorStub = cache.get.withArgs(`https://api.darksky.net/forecast/foobarapikey/12,-34,${yesterdayTime}?units=ca`);
        priorStub.returns(Promise.resolve({ daily: {
          data: [{ apparentTemperatureMin: 15, apparentTemperatureMax: 25 }],
        } }));

        data.daily.data.push({ apparentTemperatureMin: 13, apparentTemperatureMax: 22 });
        data.daily.data.push({});
      });

      afterEach(() => {
        clock.restore();
      });

      it('should get the weather history', () => {
        server.inject(query);
        expect(priorStub.called).to.be.true;
      });

      it('should compare today\'s forecast to what happened yesterday', (done) => {
        server.inject(query).then((response) => {
          expect(response.result.priority).to.be.within(15, 50);
          done();
        });
      });
    });

    describe('when either the weather city ID or weather API key are not set', () => {
      beforeEach(() => {
        process.env.DARKSKY_API_KEY = '';
        process.env.WEATHER_CITY_COORDS = '';
      });

      it('should respond with a priority 0 message', (done) => {
        server.inject(query).then((response) => {
          expect(response.result.priority).to.equal(0);
          done();
        });
      });
    });
  });
});
