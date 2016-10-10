'use strict';

const expect = require('chai').expect;
const Hapi = require('hapi');
const proxyquire = require('proxyquire');

describe('templatePlugin Plugin', () => {
  let query;
  let server;

  beforeEach(done => {
    query = '/plugins/template-plugin';

    server = new Hapi.Server();
    server.connection({});

    server.start((err) => {
      if (err) {
        throw err;
      }

      const plugin = proxyquire('../../plugins/template-plugin', {});

      server.register(plugin);

      done();
    });
  });

  afterEach(done => {
    server.stop({}, done);
  });

  describe('#GET /plugins/template-plugin', () => {
    it('should return a priority 0 payload', done => {
      server.inject(query).then(response => {
        expect(JSON.parse(response.payload).priority).to.equal(0);
        done();
      });
    });
  });
});
