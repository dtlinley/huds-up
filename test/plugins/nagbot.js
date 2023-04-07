'use strict';

const { expect } = require('chai');
const handlebars = require('handlebars');
const Hapi = require('@hapi/hapi');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const vision = require('vision');

describe('nagbot Plugin', () => {
  let query;
  let server;
  let db;

  beforeEach((done) => {
    server = new Hapi.Server();
    server.connection({});

    server.start((err) => {
      if (err) {
        throw err;
      }

      db = {
        getNags: sinon.stub(),
        getNag: sinon.stub(),
        updateNag: sinon.stub(),
        createNag: sinon.stub(),
      };

      const plugin = proxyquire('../../plugins/nagbot', {
        '../db.js': db,
      });

      server.register([plugin, vision]).then(() => {
        server.views({
          engines: { html: handlebars },
          path: `${__dirname}/../../views`,
        });

        handlebars.registerHelper('formatDate', () => {});

        done();
      });
    });
  });

  afterEach((done) => {
    server.stop({}, done);
  });

  describe('#GET /plugins/nagbot', () => {
    describe('with no nags set up', () => {
      beforeEach(() => {
        query = '/plugins/nagbot';
        db.getNags.returns(Promise.resolve([]));
      });

      it('should return a priority 0 payload', (done) => {
        server.inject(query).then((response) => {
          expect(response.result.priority).to.equal(0);
          done();
        });
      });
    });

    describe('with nags set up', () => {
      let clock;
      let fakeDate;

      beforeEach(() => {
        db.getNags.returns(Promise.resolve([
          {
            id: 1, name: 'Water the plants', interval: { days: 14 }, next: '2018-01-15T00:00:00Z',
          },
          {
            id: 2, name: 'Wash towels', interval: { days: 7 }, next: '2018-01-08T00:00:00Z',
          },
          {
            id: 3, name: 'Do this daily', interval: { days: 1 }, next: '2018-01-08T18:00:00Z',
          },
          {
            id: 4, name: 'Overdue task', interval: { days: 21 }, next: '2018-01-01T18:00:00Z',
          },
        ]));

        fakeDate = new Date('2018-01-07T18:00:00Z');
        clock = sinon.useFakeTimers(fakeDate.getTime());
      });

      afterEach(() => {
        clock.restore();
      });

      it('should return an array of plugin-response objects', (done) => {
        server.inject(query).then((response) => {
          expect(Array.isArray(response.result)).to.be.true;
          expect(response.result.length).to.equal(4);
          done();
        });
      });

      it('should have a high priority for nags that are almost due', (done) => {
        server.inject(query).then((response) => {
          expect(
            response.result.find((nag) => nag.data.id === 2).priority,
          ).to.be.greaterThan(50);
          done();
        });
      });

      it('should have a low priority for nags that aren\'t due soon', (done) => {
        server.inject(query).then((response) => {
          expect(
            response.result.find((nag) => nag.data.id === 1).priority,
          ).to.be.lessThan(20);
          done();
        });
      });

      it('should respond with the days until each nag is due', (done) => {
        server.inject(query).then((response) => {
          expect(
            response.result.find((nag) => nag.data.id === 1).data.daysToNext,
          ).to.equal(7.25);
          done();
        });
      });

      it('should respond with the name of each nag', (done) => {
        server.inject(query).then((response) => {
          expect(
            response.result.find((nag) => nag.data.id === 1).data.name,
          ).to.equal('Water the plants');
          done();
        });
      });

      it('should have a low priority for nags which have just been marked done', (done) => {
        server.inject(query).then((response) => {
          expect(
            response.result.find((nag) => nag.data.id === 3).priority,
          ).to.be.lessThan(10);
          done();
        });
      });

      it('should not exceed the highest priority when a task is overdue', (done) => {
        server.inject(query).then((response) => {
          expect(
            response.result.find((nag) => nag.data.id === 4).priority,
          ).to.be.lessThan(90);
          done();
        });
      });

      describe('when the database call fails', () => {
        beforeEach(() => {
          db.getNags.returns(Promise.reject('test database error'));
        });

        it('should respond with an error', (done) => {
          server.inject(query).then((response) => {
            expect(response.result.data.message).to.equal('Could not fetch nags');
            done();
          });
        });
      });
    });
  });

  describe('#POST /plugins/nagbot/formapi/nags/<id>', () => {
    beforeEach(() => {
      query = {
        method: 'POST',
        url: '/plugins/nagbot/formapi/nags/1',
        payload: {
          next: '2018-01-22T23:59:59Z',
        },
      };
      db.updateNag.returns(Promise.resolve());
    });

    it('should update the `next` value of the given nag', (done) => {
      server.inject(query).then(() => {
        expect(db.updateNag.calledWith(1, { next: '2018-01-22T23:59:59Z' })).to.be.ok;
        done();
      });
    });

    it('should render a page indicating that the nag has been updated', (done) => {
      server.inject(query).then((response) => {
        expect(response.result).to.have.string('<body');
        expect(response.result).to.have.string('Nag updated');
        done();
      });
    });

    describe('when the database fails', () => {
      beforeEach(() => {
        db.updateNag.rejects('database error');
      });

      it('should render an error page', (done) => {
        server.inject(query).then((response) => {
          expect(response.result).to.have.string('<body');
          expect(response.result).to.have.string('could not be updated');
          expect(response.result).to.have.string('database error');
          done();
        });
      });
    });
  });

  describe('#POST /plugins/nagbot/formapi/nags', () => {
    beforeEach(() => {
      query = {
        method: 'POST',
        url: '/plugins/nagbot/formapi/nags',
        payload: {
          name: 'Task name',
          intervalCount: '2',
          intervalLength: 'weeks',
          next: '2018-01-22T23:59:59Z',
        },
      };
      db.createNag.resolves();
    });

    it('should create a new nag', (done) => {
      server.inject(query).then(() => {
        expect(db.createNag.calledWith({
          name: 'Task name',
          interval: '2 weeks',
          next: '2018-01-22T23:59:59Z',
        })).to.be.true;
        done();
      });
    });

    it('should render a page showing that the nag has been created', (done) => {
      server.inject(query).then((response) => {
        expect(response.result).to.have.string('<body');
        expect(response.result).to.have.string('Nag created');
        expect(response.result).to.have.string('Task name');
        done();
      });
    });

    describe('when the database fails', () => {
      beforeEach(() => {
        db.createNag.rejects('test database error');
      });

      it('should render an error page', (done) => {
        server.inject(query).then((response) => {
          expect(response.result).to.have.string('<body');
          expect(response.result).to.have.string('test database error');
          done();
        });
      });
    });
  });

  describe('#PUT /plugins/nagbot/nags/<id>', () => {
    beforeEach(() => {
      query = {
        method: 'PUT',
        url: '/plugins/nagbot/nags/123',
        payload: {
          next: '2018-01-01T12:00:00Z',
        },
      };
      db.updateNag.resolves({ id: 123, name: 'Sample name', interval: '1 week' });
    });

    it('should allow the nag to be updated', (done) => {
      server.inject(query).then(() => {
        expect(db.updateNag.calledWith(123, { next: '2018-01-01T12:00:00Z' })).to.be.ok;
        done();
      });
    });

    it('should respond with the updated nag', (done) => {
      server.inject(query).then((response) => {
        expect(response.result.id).to.equal(123);
        expect(response.result.name).to.equal('Sample name');
        done();
      });
    });

    describe('when the database call fails', () => {
      beforeEach(() => {
        db.updateNag.rejects('db call failed');
      });

      it('should respond with an error message', (done) => {
        server.inject(query).then((response) => {
          expect(response.result.data.error.name).to.have.string('db call failed');
          done();
        });
      });
    });
  });

  describe('#POST /plugins/nagbot/nags', () => {
    beforeEach(() => {
      query = {
        method: 'POST',
        url: '/plugins/nagbot/nags',
        payload: {
          name: 'Newly created plugin',
          intervalCount: '3',
          intervalLength: 'days',
          next: '2018-01-01T12:00:00Z',
        },
      };
      db.createNag.resolves({
        id: 1,
        name: 'Newly created plugin',
        intervalCount: '3',
        intervalLength: 'days',
        next: '2018-01-01T12:00:00Z',
      });
    });

    it('should create a new nag', (done) => {
      server.inject(query).then(() => {
        expect(db.createNag.calledWith({
          name: 'Newly created plugin',
          interval: '3 days',
          next: '2018-01-01T12:00:00Z',
        })).to.be.ok;
        done();
      });
    });

    it('should respond with the new nag', (done) => {
      server.inject(query).then((response) => {
        expect(response.result.id).to.equal(1);
        done();
      });
    });

    describe('when the database call fails', () => {
      beforeEach(() => {
        db.createNag.rejects('create call failed');
      });

      it('should respond with an error message', (done) => {
        server.inject(query).then((response) => {
          expect(response.result.data.error.name).to.have.string('create call failed');
          done();
        });
      });
    });
  });
});
