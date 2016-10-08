'use strict';

const expect = require('chai').expect;
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

describe('Server', () => {
  let wreck;
  let server;

  beforeEach(done => {
    wreck = {
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

    const bazPlugin = {
      register: () => {},
    };
    barPlugin.register.attributes = {
      name: 'bazPlugin',
    };

    const promise = proxyquire('../server', {
      wreck,
      fs: {
        readdir: (path, callback) => {
          callback(undefined, ['foo.js', 'bar.js', 'baz.js']);
        },
      },
      './plugins/foo': fooPlugin,
      './plugins/bar': barPlugin,
      './plugins/baz': bazPlugin,
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
      let getSpy;

      beforeEach(() => {
        query = {
          method: 'GET',
          url: '/plugins',
        };

        getSpy = wreck.get.withArgs(sinon.match('/plugins/foo'))
        .yields(undefined, undefined, JSON.stringify({ data: 'foo', priority: 3 }));

        wreck.get.withArgs(sinon.match('/plugins/bar'))
        .yields(undefined, undefined, JSON.stringify({ data: 'bar', priority: 1 }));

        wreck.get.withArgs(sinon.match('/plugins/baz'))
        .yields(undefined, undefined, JSON.stringify({ data: 'baz', priority: 2 }));
      });

      it('should respond with a 200 status code', done => {
        server.inject(query).then(response => {
          expect(response.statusCode).to.equal(200);
          done();
        });
      });

      it('should fetch thumbnail data from each registered plugin', done => {
        server.inject(query).then(() => {
          expect(wreck.get.calledWith(sinon.match('/plugins/foo'))).to.be.true;

          expect(wreck.get.calledWith(sinon.match('/plugins/bar'))).to.be.true;

          expect(wreck.get.calledWith(sinon.match('/plugins/baz'))).to.be.true;

          done();
        });
      });

      it('should reply with an array of all the plugin thumbnail data', done => {
        server.inject(query).then(response => {
          expect(response.result.length).to.equal(3);
          expect(response.result).to.contain({ data: 'foo', priority: 3 });
          expect(response.result).to.contain({ data: 'bar', priority: 1 });
          expect(response.result).to.contain({ data: 'baz', priority: 2 });
          done();
        });
      });

      it('should sort the data by priority (highest to lowest)', done => {
        server.inject(query).then(response => {
          expect(response.result[0].priority).to.equal(3);
          expect(response.result[1].priority).to.equal(2);
          expect(response.result[2].priority).to.equal(1);
          done();
        });
      });

      describe('when a plugin responds with 0 priority', () => {
        beforeEach(() => {
          getSpy
          .yields(undefined, undefined, JSON.stringify({ data: 'foo', priority: 0 }));
        });

        it('should filter out that response from the list', done => {
          server.inject(query).then(response => {
            expect(response.result.length).to.equal(2);
            expect(response.result).to.contain({ data: 'bar', priority: 1 });
            expect(response.result).to.contain({ data: 'baz', priority: 2 });
            done();
          });
        });
      });
    });
  });
});
