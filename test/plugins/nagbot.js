'use strict';

const expect = require('chai').expect;
const handlebars = require('handlebars');
const Hapi = require('hapi');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const vision = require('vision');

describe('nagbot Plugin', () => {
  let query;
  let server;
  let db;

  beforeEach(done => {
    server = new Hapi.Server();
    server.connection({});

    server.start((err) => {
      if (err) {
        throw err;
      }

      db = {
        getNags: sinon.stub(),
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

  afterEach(done => {
    server.stop({}, done);
  });

  describe('#GET /plugins/nagbot', () => {
    describe('with no nags set up', () => {
      beforeEach(() => {
        query = '/plugins/nagbot';
        db.getNags.returns(Promise.resolve([]));
      });

      it('should return a priority 0 payload', done => {
        server.inject(query).then(response => {
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
          { id: 1, name: 'Water the plants', interval: '2 weeks', next: '2018-01-15T00:00:00Z' },
          { id: 2, name: 'Wash towels', interval: '1 weeks', next: '2018-01-08T00:00:00Z' },
        ]));

        fakeDate = new Date('2018-01-07T18:00:00Z');
        clock = sinon.useFakeTimers(fakeDate.getTime());
      });

      afterEach(() => {
        clock.restore();
      });

      it('should return an array of plugin-response objects', done => {
        server.inject(query).then(response => {
          expect(Array.isArray(response.result)).to.be.true;
          expect(response.result.length).to.equal(2);
          done();
        });
      });

      it('should have a high priority for nags that are almost due', done => {
        server.inject(query).then(response => {
          expect(
            response.result.find(nag => nag.data.id === 2).priority
          ).to.be.greaterThan(50);
          done();
        });
      });

      it('should have a low priority for nags that aren\'t due soon', done => {
        server.inject(query).then(response => {
          expect(
            response.result.find(nag => nag.data.id === 1).priority
          ).to.be.lessThan(20);
          done();
        });
      });

      it('should respond with the days until each nag is due', done => {
        server.inject(query).then(response => {
          expect(
            response.result.find(nag => nag.data.id === 1).data.daysToNext
          ).to.equal(7.25);
          done();
        });
      });

      it('should respond with the name of each nag', done => {
        server.inject(query).then(response => {
          expect(
            response.result.find(nag => nag.data.id === 1).data.name
          ).to.equal('Water the plants');
          done();
        });
      });

      describe('when the database call fails', () => {
        beforeEach(() => {
          db.getNags.returns(Promise.reject('test database error'));
        });

        it('should respond with an error', done => {
          server.inject(query).then(response => {
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

    it('should update the `next` value of the given nag', done => {
      server.inject(query).then(() => {
        expect(db.updateNag.calledWith(1, { next: '2018-01-22T23:59:59Z' })).to.be.ok;
        done();
      });
    });

    it('should render a page indicating that the nag has been updated', done => {
      server.inject(query).then(response => {
        expect(response.result).to.have.string('<body');
        expect(response.result).to.have.string('Nag updated');
        done();
      });
    });

    describe('when the database fails', () => {
      beforeEach(() => {
        db.updateNag.rejects('database error');
      });

      it('should render an error page', done => {
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

    it('should render a page showing that the nag has been created', done => {
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

      it('should render an error page', done => {
        server.inject(query).then((response) => {
          expect(response.result).to.have.string('<body');
          expect(response.result).to.have.string('test database error');
          done();
        });
      });
    });
  });

  describe('#PUT /plugins/nagbot/nags/<id>', () => {
    it('should allow the nag to be updated');

    describe('when the database call fails', () => {
      it('should respond with an error message');
    });
  });

  describe('#POST /plugins/nagbot/nags', () => {
    it('should create a new nag');

    it('should respond with the new nag');

    describe('when the database call fails', () => {
      it('should respond with an error message');
    });
  });
});
