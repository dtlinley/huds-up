'use strict';

const expect = require('chai').expect;
const Hapi = require('hapi');
const proxyquire = require('proxyquire');

describe('diskUsage Plugin', () => {
  let query;
  let server;

  beforeEach(done => {
    query = '/plugins/disk-usage';

    server = new Hapi.Server();
    server.connection({});

    server.start((err) => {
      if (err) {
        throw err;
      }

      const plugin = proxyquire('../../plugins/disk-usage', {});

      server.register(plugin);

      done();
    });
  });

  afterEach(done => {
    server.stop({}, done);
  });

  describe('#GET /plugins/disk-usage', () => {
    it('should return a priority 0 payload', done => {
      server.inject(query).then(response => {
        expect(JSON.parse(response.payload).priority).to.equal(0);
        done();
      });
    });
  });
});
