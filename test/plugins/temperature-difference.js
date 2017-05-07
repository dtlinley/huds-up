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

  let today;
  let yesterdayTime;
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

    wreck = {
      get: sinon.stub(),
    };

    const plugin = proxyquire('../../plugins/temperature-difference', {
      wreck: {
        defaults: () => wreck,
      },
    });

    server.register(plugin);

    today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterdayTime = Math.floor(yesterday.getTime() / 1000);
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
          data: [
            { apparentTemperatureMin: 15, apparentTemperatureMax: 25 },
          ],
        },
      };
      wreck.get.yields(null, null, data);
    });

    it('should get the weather forecast', () => {
      server.inject(query);
      expect(wreck.get.calledWith(`https://api.darksky.net/forecast/foobarapikey/12,-34,${yesterdayTime}&units=ca`)).to.be.true;
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
            data.daily.data.push({ apparentTemperatureMin: 10, apparentTemperatureMax: 20 });
          });

          it('should respond with a medium priority message', (done) => {
            server.inject(query).then((response) => {
              expect(response.result.priority).to.be.within(15, 50);
              done();
            });
          });

          describe('by a significant amount', () => {
            beforeEach(() => {
              data.daily.data[2] = { apparentTemperatureMin: -5, apparentTemperatureMax: 5 };
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
          data.daily.data.push({ apparentTemperatureMin: 5, apparentTemperatureMax: 15 });
        });

        describe('and tomorrow will be less pleasant', () => {
          beforeEach(() => {
            data.daily.data.push({ apparentTemperatureMin: 0, apparentTemperatureMax: 10 });
          });

          it('should respond with a higher priority than if tomorrow is more pleasant', (done) => {
            server.inject(query).then((lessPleasantResponse) => {
              const unpleasantPriority = lessPleasantResponse.result.priority;
              data.daily.data[2] = { apparentTemperatureMin: 10, apparentTemperatureMax: 20 };
              wreck.get.yields(null, null, data);
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
      beforeEach(() => {
        today.setHours(7);
        clock = sinon.useFakeTimers(today.getTime());

        data.daily.data.push({ apparentTemperatureMin: 10, apparentTemperatureMax: 20 });
      });

      afterEach(() => {
        clock.restore();
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
