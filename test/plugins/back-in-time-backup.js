'use strict';

const expect = require('chai').expect;
const Hapi = require('hapi');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('Back In Time Backup Plugin', () => {
  let query;
  let fs;
  let server;
  let backintimeDir;

  beforeEach(done => {
    backintimeDir = process.env.BACKINTIME_DIR;
    process.env.BACKINTIME_DIR = '/back/in/time/dir';

    query = '/plugins/back-in-time-backup';

    fs = {
      readdir: sinon.stub(),
    };

    server = new Hapi.Server();
    server.connection({});

    server.start((err) => {
      if (err) {
        throw err;
      }

      const plugin = proxyquire('../../plugins/back-in-time-backup', {
        fs,
      });

      server.register(plugin);

      done();
    });
  });

  afterEach(done => {
    server.stop({}, done);
    process.env.BACKINTIME_DIR = backintimeDir;
  });

  /*
   * Back In Time backups are stored in folders that follow a date-based naming convention
   * A typical BIT backup folder is named something like '20160114-160512-123', where:
   * '20160114' (the first section) refers to the date in YYYYMMDD format
   * '160512' (the second section) refers to the time the backup finished in HHMMSS format
   * '123' (the third section) appears to be a sequence number of some kind
   */
  describe('#GET /plugins/back-in-time-backup', () => {
    let clock;

    beforeEach(() => {
      const fakeNow = '2016-01-15T14:00:00';
      const date = new Date(fakeNow);
      date.setHours(date.getHours() + (date.getTimezoneOffset() / 60));
      clock = sinon.useFakeTimers(date.getTime());
    });

    afterEach(() => {
      clock.restore();
    });

    describe('when there is no configured backup location', () => {
      beforeEach(() => {
        process.env.BACKINTIME_DIR = '';
      });

      it('should not attempt to read from the file system', done => {
        server.inject(query).then(() => {
          expect(fs.readdir.called).to.be.false;
          done();
        });
      });

      it('should respond with priority 0', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.equal(0);
          done();
        });
      });
    });

    describe('when the filesystem cannot be read', () => {
      beforeEach(() => {
        fs.readdir.yields('Something went wrong');
      });

      it('should respond with a 200 status code', done => {
        server.inject(query).then(response => {
          expect(response.statusCode).to.equal(200);
          done();
        });
      });

      it('should respond with a high priority message (not able to read location)', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.be.above(70);
          expect(response.result.data.message).to.include('Filesystem error');
          done();
        });
      });
    });

    describe('when there are no recognized backups in the backup location', () => {
      beforeEach(() => {
        fs.readdir.yields(undefined, []);
      });

      it('should respond with a 200 status code', done => {
        server.inject(query).then(response => {
          expect(response.statusCode).to.equal(200);
          done();
        });
      });

      it('should respond with a high priority message about no backups', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.be.above(70);
          expect(response.result.data.message).to.include('No backups found');
          done();
        });
      });
    });

    describe('when there is a backup that is less than a day old', () => {
      beforeEach(() => {
        fs.readdir.yields(undefined, [
          '20160114-160000-283',
          '20160113-160302-123',
          '20160110-160001-492',
        ]);
      });

      it('should respond with a very low priority message', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.be.below(15);
          done();
        });
      });
    });

    describe('when there has not been a backup in several days', () => {
      beforeEach(() => {
        fs.readdir.yields(undefined, [
          '20160114-110000-283',
          '20160113-160302-123',
          '20160110-160001-492',
        ]);
      });

      it('should respond with a higher priority message', done => {
        server.inject(query).then(response => {
          expect(response.result.priority).to.be.above(30);
          done();
        });
      });

      it('should respond with a higher priority the longer it has been since last backup', done => {
        fs.readdir.yields(undefined, [
          '20160110-160000-283',
          '20160109-160302-123',
          '20160108-160001-492',
        ]);

        server.inject(query).then(response => {
          expect(response.result.priority).to.be.above(50);
          done();
        });
      });
    });

    describe('when there are non-backup folders in the backup directory', () => {
      beforeEach(() => {
        fs.readdir.yields(undefined, [
          '20160114-160000-123',
          '20160113-160000-123',
          '20160112-160000-123',
          'last_snapshot',
          'abcde',
        ]);
      });

      it('should not return the same priority as if they weren\'t there', done => {
        server.inject(query).then(response => {
          const withGarbage = response.result.priority;
          fs.readdir.yields(undefined, [
            '20160114-160000-123',
            '20160113-160000-123',
            '20160112-160000-123',
          ]);
          server.inject(query).then(baseResponse => {
            const withoutGarbage = JSON.parse(baseResponse.payload).priority;
            expect(withGarbage).to.equal(withoutGarbage);
            done();
          });
        });
      });
    });

    describe('when there are backups from the future', () => {
      beforeEach(() => {
        fs.readdir.yields(undefined, [
          '20160320-130000-123',
          '20160227-180000-123',
          '20160113-110000-123',
          '20160112-010000-123',
          '20160111-070000-123',
        ]);
      });

      it('should disregard any future backups', done => {
        server.inject(query).then(response => {
          const withFuture = response.result.priority;
          fs.readdir.yields(undefined, [
            '20160113-110000-123',
            '20160112-010000-123',
            '20160111-070000-123',
          ]);
          server.inject(query).then(baseResponse => {
            const withoutFuture = JSON.parse(baseResponse.payload).priority;
            expect(withFuture).to.equal(withoutFuture);
            done();
          });
        });
      });
    });
  });
});
