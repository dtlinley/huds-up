'use strict';

const { expect } = require('chai');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

describe('Home page', () => {
  let port;
  let wreck;
  let server;

  beforeEach((done) => {
    port = process.env.PORT;
    process.env.PORT = 0;
    wreck = {
      get: sinon.stub(),
    };

    const diskUsage = {
      register: () => {},
    };
    diskUsage.register.attributes = {
      name: 'diskUsage',
    };

    const promise = proxyquire('../../server', {
      wreck,
      fs: {
        readdir: (path, callback) => {
          callback(undefined, ['disk-usage.js']);
        },
      },
      './plugins/disk-usage': diskUsage,
    });
    wreck.get.withArgs(sinon.match('/plugins/disk-usage'))
      .yields(undefined, undefined, JSON.stringify({
        data: {
          filesystems: [
            { mount: '/foo', capacity: 30 },
          ],
        },
        priority: 1,
        type: 'disk-usage',
      }));

    promise.then((srv) => {
      server = srv;
      done();
    });
  });

  afterEach((done) => {
    process.env.PORT = port;
    server.stop({}, done);
  });

  it('should show at least one card', (done) => {
    server.inject('/').then((response) => {
      expect(response.payload).to.contain('card');
      done();
    });
  });
});
