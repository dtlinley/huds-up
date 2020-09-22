'use strict';

const expect = require('chai').expect;
const Hapi = require('hapi');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');

describe('ttcAlert Plugin', () => {
  let query;
  let server;
  let cache;

  beforeEach(done => {
    const html = fs.readFileSync(path.join(__dirname, 'ttc-sample-data.html'), 'utf8');
    query = '/plugins/ttc-alert';

    server = new Hapi.Server();
    server.connection({});

    cache = {
      get: sinon.stub().returns(Promise.resolve(Buffer.from(html))),
    };

    server.start((err) => {
      if (err) {
        throw err;
      }

      const plugin = proxyquire('../../plugins/ttc-alert', {
        '../cache.js': cache,
      });

      server.register(plugin);

      done();
    });
  });

  afterEach(done => {
    server.stop({}, done);
  });

  describe('#GET /plugins/ttc-alert', () => {
    describe('when there is an error loading the TTC data', () => {
      beforeEach(() => {
        cache.get.returns(Promise.reject('404 - Not found'));
      });

      it('should respond with a high priority payload', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.be.above(60);
          done();
        });
      });

      it('should send the network error back with the response', done => {
        server.inject(query).then(response => {
          expect(response.result.data.error).to.equal('404 - Not found');
          done();
        });
      });
    });

    describe('when there are no alerts currently affecting the user', () => {
      let routes;

      beforeEach(() => {
        // Sample data has alerts for Line 4, Line 2 and Jane Station
        routes = process.env.TTC_ROUTES_STATIONS;
        process.env.TTC_ROUTES_STATIONS = 'Line 1, Yonge Station';
      });

      afterEach(() => {
        process.env.TTC_ROUTES_STATIONS = routes;
      });

      it('should respond with a low priority message', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.be.below(20);
          done();
        });
      });

      it('should respond with an empty array of alerts', done => {
        server.inject(query).then(response => {
          expect(response.result.data.alerts.length).to.equal(0);
          done();
        });
      });
    });

    describe('when there is an alert affecting the user\'s route', () => {
      let routes;

      beforeEach(() => {
        // Sample data has alerts for Line 4, Line 2 and Jane Station
        routes = process.env.TTC_ROUTES_STATIONS;
        process.env.TTC_ROUTES_STATIONS = 'Line 4, Jane Station';
      });

      afterEach(() => {
        process.env.TTC_ROUTES_STATIONS = routes;
      });

      it('should respond with a medium priority message', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.be.above(20);
          done();
        });
      });

      it('should include the whole alert in the response', done => {
        server.inject(query).then(response => {
          expect(response.result.data.alerts.length).to.equal(2);
          expect(response.result.data.alerts[0]).to.equal(
            'Elevator Alert: Jane Station, WB platform to concourse level, elevator is out of  service.' // eslint-disable-line max-len
          );
          done();
        });
      });
    });
  });
});
