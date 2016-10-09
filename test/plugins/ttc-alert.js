'use strict';

const expect = require('chai').expect;
const Hapi = require('hapi');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('ttcAlert Plugin', () => {
  let query;
  let server;
  let wreck;

  beforeEach(done => {
    query = '/plugins/ttc-alert';

    server = new Hapi.Server();
    server.connection({});

    wreck = {
      get: sinon.stub().yields(null, undefined, ''),
    };

    server.start((err) => {
      if (err) {
        throw err;
      }

      const plugin = proxyquire('../../plugins/ttc-alert', {
        wreck,
      });

      server.register(plugin);

      done();
    });
  });

  afterEach(done => {
    server.stop({}, done);
  });

  describe('#GET /plugins/ttc-alert', () => {
    it('should return a priority 0 payload', done => {
      server.inject(query).then(response => {
        expect(JSON.parse(response.payload).priority).to.equal(0);
        done();
      });
    });

    describe('when there is an error loading the TTC data', () => {
      it('should respond with a high priority payload');

      it('should send the network error back with the response');
    });

    describe('when there are no alerts currently affecting the user', () => {
      it('should respond with a low priority message');

      it('should respond with an empty array of alerts');
    });

    describe('when there is an alert affecting the user\'s route', () => {
      it('should respond with a high priority message');

      it('should include the whole alert in the response');
    });
  });
});
