'use strict';

const { expect } = require('chai');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

describe('Database', () => {
  let pgClient;
  let db;

  beforeEach(() => {
    pgClient = {
      connect: sinon.stub().yields(),
      end: sinon.stub(),
      query: sinon.stub().resolves(),
    };
    const pg = {
      Client: sinon.stub().returns(pgClient),
    };

    db = proxyquire('../db', {
      pg,
    });
  });

  describe('#getNags', () => {
    beforeEach(() => {
      pgClient.query.withArgs('SELECT * FROM nags').resolves({
        rows: [
          {
            id: 1, name: 'Water the plants', interval: '2 weeks', next: '2018-01-15T00:00:00Z',
          },
          {
            id: 2, name: 'Wash towels', interval: '1 weeks', next: '2018-01-08T00:00:00Z',
          },
        ],
      });
    });

    it('should read from the nags table', (done) => {
      db.getNags().then(() => {
        expect(pgClient.query.calledWith(
          'SELECT * FROM nags',
        )).to.be.true;
        done();
      });
    });

    it('should return a promise that resolves with all nags', (done) => {
      db.getNags().then((nags) => {
        expect(nags.length).to.equal(2);
        expect(nags[0].name).to.equal('Water the plants');
        done();
      });
    });

    describe('when the database connection fails', () => {
      beforeEach(() => {
        pgClient.query.withArgs('SELECT * FROM nags')
          .rejects(Error('test database error'));
      });

      it('should reject with the error', (done) => {
        db.getNags().catch((error) => {
          expect(error).to.equal('test database error');
          done();
        });
      });
    });
  });

  describe('#updateNag', () => {
    let updatePayload;

    beforeEach(() => {
      updatePayload = { next: '2018-01-01T00:00:00Z' };
      pgClient.query.resolves({
        rows: [{
          id: 123, name: 'Test nag', interval: '2 weeks', next: '2018-01-01T00:00:00Z',
        }],
      });
    });

    it('should update the nag with the given ID', (done) => {
      db.updateNag(123, updatePayload).then(() => {
        expect(pgClient.query.calledWithMatch('WHERE id = $1', [123, '2018-01-01T00:00:00Z'])).to.be.ok;
        done();
      });
    });

    it('should return the updated nag', (done) => {
      db.updateNag(123, updatePayload).then((nag) => {
        expect(nag.id).to.equal(123);
        done();
      });
    });

    describe('with only one property being updated', () => {
      it('should update only that property of the nag', (done) => {
        db.updateNag(123, updatePayload).then(() => {
          expect(pgClient.query.calledWithMatch(
            'UPDATE nags SET next = $2',
            [123, '2018-01-01T00:00:00Z'],
          )).to.be.ok;
          done();
        });
      });
    });

    describe('with multiple properties updated', () => {
      beforeEach(() => {
        updatePayload = {
          name: 'foobar',
          next: '2018-01-01T00:00:00Z',
        };
      });

      it('should update all properties of the given nag', (done) => {
        db.updateNag(123, updatePayload).then(() => {
          expect(pgClient.query.calledWithMatch(
            'UPDATE nags SET name = $2,next = $3',
            [123, 'foobar', '2018-01-01T00:00:00Z'],
          )).to.be.ok;
          done();
        });
      });
    });

    describe('when the database fails', () => {
      beforeEach(() => {
        pgClient.query.rejects(Error('test database error'));
      });

      it('should return a rejected promise', (done) => {
        db.updateNag(123, updatePayload).catch((error) => {
          expect(error).to.equal('test database error');
          done();
        });
      });
    });
  });

  describe('#createNag', () => {
    let createPayload;

    beforeEach(() => {
      createPayload = {
        name: 'Test create nag',
        interval: '1 months',
        next: '2018-01-01T01:02:03Z',
      };

      pgClient.query.resolves({
        rows: [{
          id: 1,
          name: 'Test create nag',
          interval: '1 months',
          next: '2018-01-01T01:02:03Z',
        }],
      });
    });

    it('should add a nag to the database', (done) => {
      db.createNag(createPayload).then(() => {
        expect(pgClient.query.calledWith(
          'INSERT INTO nags (name, interval, next) VALUES ($1, $2, $3) RETURNING *',
          ['Test create nag', '1 months', '2018-01-01T01:02:03Z'],
        )).to.be.ok;
        done();
      });
    });

    it('should respond with the new nag', (done) => {
      db.createNag(createPayload).then((nag) => {
        expect(nag.id).to.equal(1);
        expect(nag.name).to.equal('Test create nag');
        done();
      });
    });

    describe('when the database query fails', () => {
      beforeEach(() => {
        pgClient.query.rejects(Error('something went horribly wrong'));
      });

      it('should return a rejected promise', (done) => {
        db.createNag(createPayload).catch((error) => {
          expect(error).to.equal('something went horribly wrong');
          done();
        });
      });
    });

    describe('when the database client cannot connect', () => {
      beforeEach(() => {
        pgClient.connect.yields('could not connect to db');
        db = proxyquire('../db', {
          pg: {
            Client: sinon.stub().returns(pgClient),
          },
        });
      });

      it('should return a rejected promise', (done) => {
        db.createNag(createPayload).catch((error) => {
          expect(error).to.equal('could not connect to db');
          done();
        });
      });
    });
  });

  describe('#deleteNag', () => {
    beforeEach(() => {
      pgClient.query.withArgs('DELETE FROM nags WHERE id = $1', [123]).resolves();
    });

    it('should delete the nag from the database', (done) => {
      db.deleteNag(123).then(() => {
        expect(pgClient.query.calledWith('DELETE FROM nags WHERE id = $1', [123])).to.be.ok;
        done();
      });
    });

    describe('when the database call fails', () => {
      beforeEach(() => {
        pgClient.query.withArgs('DELETE FROM nags WHERE id = $1', [123]).rejects(Error('sample error'));
      });

      it('should return a rejected promise', (done) => {
        db.deleteNag(123).catch((error) => {
          expect(error).to.equal('sample error');
          done();
        });
      });
    });
  });

  describe('#getNag', () => {
    beforeEach(() => {
      pgClient.query.withArgs('SELECT * FROM nags WHERE id = $1', [345]).resolves({
        rows: [
          {
            id: 345,
            name: 'Fake GET task',
            interval: '1 days',
            next: '2018-01-01T00:00:00Z',
          },
        ],
      });
    });

    it('should respond with the single nag', (done) => {
      db.getNag(345).then((nag) => {
        expect(nag.id).to.equal(345);
        expect(nag.next).to.equal('2018-01-01T00:00:00Z');
        done();
      });
    });

    describe('when the database call fails', () => {
      beforeEach(() => {
        pgClient.query.withArgs('SELECT * FROM nags WHERE id = $1', [345]).rejects(Error('whoops'));
      });

      it('should return a rejected promise', (done) => {
        db.getNag(345).catch((error) => {
          expect(error).to.equal('whoops');
          done();
        });
      });
    });
  });
});
