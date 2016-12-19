'use strict';

const expect = require('chai').expect;
const Hapi = require('hapi');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('Disk Usage Plugin', () => {
  let query;
  let server;
  let dfMock;

  beforeEach(done => {
    query = '/plugins/disk-usage';
    dfMock = sinon.stub();

    server = new Hapi.Server();
    server.connection({});

    server.start((err) => {
      if (err) {
        throw err;
      }

      const plugin = proxyquire('../../plugins/disk-usage', {
        'node-df': dfMock,
      });

      server.register(plugin);

      done();
    });
  });

  afterEach(done => {
    server.stop({}, done);
  });

  describe('#GET /plugins/disk-usage', () => {
    let fsList;
    let diskFreeMounts;

    beforeEach(() => {
      fsList = [
        {
          filesystem: '/dev/foo',
          capacity: 0.9,
          mount: '/mnt/foo',
        },
        {
          filesystem: '/dev/bar',
          capacity: 0.1,
          mount: '/home/bar',
        },
        {
          filesystem: '/dev/baz',
          capacity: 0.6,
          mount: '/boot/baz',
        },
      ];
      dfMock.yields(null, fsList);

      diskFreeMounts = process.env.DISK_FREE_MOUNTS;
    });

    afterEach(() => {
      process.env.DISK_FREE_MOUNTS = diskFreeMounts;
    });

    describe('when there is a single filesystem being monitored', () => {
      beforeEach(() => {
        process.env.DISK_FREE_MOUNTS = '/mnt/foo';
      });

      it('should respond with the percent usage of the filesystem', done => {
        server.inject(query).then(response => {
          expect(response.result.data.filesystems[0].capacity).to.equal(0.9);
          done();
        });
      });

      it('should respond with only the data for that filesystem', done => {
        server.inject(query).then(response => {
          expect(response.result.data.filesystems.length).to.equal(1);
          done();
        });
      });

      describe('when the filesystem is not very full', () => {
        beforeEach(() => {
          fsList[0].capacity = 0.1;
        });

        it('should respond with a low-priority message', done => {
          server.inject(query).then(response => {
            expect(response.result.priority).to.be.below(5);
            expect(response.result.priority).to.be.above(0);
            done();
          });
        });
      });

      describe('when the filesystem is mildly full', () => {
        beforeEach(() => {
          fsList[0].capacity = 0.6;
        });

        it('should respond with a low-to-medium priority message', done => {
          server.inject(query).then(response => {
            expect(response.result.priority).to.be.below(20);
            expect(response.result.priority).to.be.above(0);
            done();
          });
        });
      });

      describe('when the filesystem is very full', () => {
        beforeEach(() => {
          fsList[0].capacity = 0.95;
        });

        it('should respond with a semi-high priority message', done => {
          server.inject(query).then(response => {
            expect(response.result.priority).to.be.below(90);
            expect(response.result.priority).to.be.above(50);
            done();
          });
        });
      });
    });

    describe('when there are no filesystems being monitored', () => {
      beforeEach(() => {
        process.env.DISK_FREE_MOUNTS = '';
      });

      it('should respond with a 0 priority message', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.equal(0);
          done();
        });
      });
    });

    describe('when there are filesystems being monitored, but no file systems match', () => {
      beforeEach(() => {
        process.env.DISK_FREE_MOUNTS = '/fake/mount,/also/fake,/not/real';
      });

      it('should respond with a high priority message', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.be.above(80);
          done();
        });
      });
    });

    describe('when there is an error reading filesystem information', () => {
      beforeEach(() => {
        dfMock.yields('Something went wrong');
        process.env.DISK_FREE_MOUNTS = '/mnt/foo';
      });

      it('should respond with a high priority message', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.be.above(80);
          done();
        });
      });
    });

    describe('when there are multiple filesystems being monitored', () => {
      beforeEach(() => {
        process.env.DISK_FREE_MOUNTS = '/mnt/foo,/home/bar';
      });

      it('should respond with the name of each filesystem', done => {
        server.inject(query).then(response => {
          expect(response.result.data.filesystems.length).to.equal(2);
          expect(response.result.data.filesystems[0].filesystem).to.equal('/dev/foo');
          expect(response.result.data.filesystems[1].filesystem).to.equal('/dev/bar');
          done();
        });
      });

      it('should respond with the percent usage of each filesystem', done => {
        server.inject(query).then(response => {
          expect(response.result.data.filesystems[0].capacity).to.equal(0.9);
          expect(response.result.data.filesystems[1].capacity).to.equal(0.1);
          done();
        });
      });

      it('should respond with the mount point of each filesystem', done => {
        server.inject(query).then(response => {
          expect(response.result.data.filesystems[0].mount).to.equal('/mnt/foo');
          expect(response.result.data.filesystems[1].mount).to.equal('/home/bar');
          done();
        });
      });

      describe('when all filesystems are very empty', () => {
        beforeEach(() => {
          fsList[0].capacity = 0.05;
          fsList[1].capacity = 0.15;
        });

        it('should respond with a low-priority message', done => {
          server.inject(query).then(response => {
            expect(response.result.priority).to.be.below(5);
            expect(response.result.priority).to.be.above(0);
            done();
          });
        });
      });

      describe('when one or more filesystems are very full', () => {
        beforeEach(() => {
          fsList[0].capacity = 0.05;
          fsList[1].capacity = 0.99;
        });

        it('should respond with a semi-high priority message', done => {
          server.inject(query).then(response => {
            expect(response.result.priority).to.be.below(90);
            expect(response.result.priority).to.be.above(70);
            done();
          });
        });
      });

      describe('when all of the filesystems are at most mildly full', () => {
        beforeEach(() => {
          fsList[0].capacity = 0.35;
          fsList[1].capacity = 0.69;
        });

        it('should respond with a low-to-medium priority message', done => {
          server.inject(query).then(response => {
            expect(response.result.priority).to.be.below(50);
            expect(response.result.priority).to.be.above(0);
            done();
          });
        });
      });
    });
  });
});
