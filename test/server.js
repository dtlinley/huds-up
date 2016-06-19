'use strict';

const expect = require('chai').expect;
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

describe('Server', () => {
  let http;
  let server;

  beforeEach(done => {
    http = {
      get: sinon.stub(),
    };

    const fooPlugin = {
      register: () => {},
    };
    fooPlugin.register.attributes = {
      name: 'fooPlugin',
    };

    const barPlugin = {
      register: () => {},
    };
    barPlugin.register.attributes = {
      name: 'barPlugin',
    };

    const promise = proxyquire('../server', {
      http,
      fs: {
        readdir: (path, callback) => {
          callback(undefined, ['foo.js', 'bar.js']);
        },
      },
      './plugins/foo': fooPlugin,
      './plugins/bar': barPlugin,
    });

    promise.then(srv => {
      server = srv;
      done();
    });
  });

  afterEach(done => {
    server.stop({}, done);
  });

  it('should start the server automatically', () => {
    expect(server).to.exist;
  });

  describe('plugin API', () => {
    describe('#query', () => {
      let query;

      beforeEach(() => {
        query = {
          method: 'GET',
          url: '/plugins',
        };

        http.get.withArgs({
          path: '/plugins/foo',
          port: process.env.PORT || 8080,
        }).yields(undefined, { data: 'foo' });

        http.get.withArgs({
          path: '/plugins/bar',
          port: process.env.PORT || 8080,
        }).yields(undefined, { data: 'bar' });
      });

      it('should respond with a 200 status code', done => {
        server.inject(query).then(response => {
          expect(response.statusCode).to.equal(200);
          done();
        });
      });

      it('should fetch thumbnail data from each registered plugin', done => {
        server.inject(query).then(() => {
          expect(http.get.calledWith({
            path: '/plugins/foo',
            port: process.env.PORT || 8080,
          })).to.be.true;

          expect(http.get.calledWith({
            path: '/plugins/bar',
            port: process.env.PORT || 8080,
          })).to.be.true;

          done();
        });
      });

      it('should reply with an array of all the plugin thumbnail data', done => {
        server.inject(query).then(response => {
          expect(response.result.length).to.equal(2);
          expect(response.result).to.contain({ data: 'foo' });
          expect(response.result).to.contain({ data: 'bar' });
          done();
        });
      });
    });
  });
});
