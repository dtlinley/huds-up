'use strict';

const expect = require('chai').expect;
const Hapi = require('hapi');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe.only('nagbot Plugin', () => {
  let query;
  let server;
  let db;

  beforeEach(done => {
    query = '/plugins/nagbot';

    server = new Hapi.Server();
    server.connection({});

    server.start((err) => {
      if (err) {
        throw err;
      }

      db = {
        getNags: sinon.stub(),
      };

      const plugin = proxyquire('../../plugins/nagbot', {
        '../'
      });

      server.register(plugin);

      done();
    });
  });

  afterEach(done => {
    server.stop({}, done);
  });

  describe('#GET /plugins/nagbot', () => {
    describe('with no nags set up', () => {
      it('should return a priority 0 payload', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.equal(0);
          done();
        });
      });
    });

    describe('with nags set up', () => {
      beforeEach(() => {

      });

      it('should return an array of plugin-response objects', () => {

      });
    });

  });
});
