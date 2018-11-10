'use strict';

const expect = require('chai').expect;
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
          { id: 1, name: 'Water the plants', interval: '2 weeks', next: '2018-01-15T00:00:00Z' },
          { id: 2, name: 'Wash towels', interval: '1 weeks', next: '2018-01-08T00:00:00Z' },
        ],
      });
    });

    it('should read from the nags table', done => {
      db.getNags().then(() => {
        expect(pgClient.query.calledWith(
          'SELECT * FROM nags'
        )).to.be.true;
        done();
      });
    });

    it('should return a promise that resolves with all nags', done => {
      db.getNags().then(nags => {
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

      it('should reject with the error', done => {
        db.getNags().catch(error => {
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
    });

    it('should update the nag with the given ID', done => {
      db.updateNag(123, updatePayload).then(() => {
        expect(pgClient.query.calledWithMatch('WHERE id = $1', [123, '2018-01-01T00:00:00Z']))
          .to.be.ok;
        done();
      });
    });

    describe('with only one property being updated', () => {
      it('should update only that property of the nag', done => {
        db.updateNag(123, updatePayload).then(() => {
          expect(pgClient.query.calledWithMatch(
            'UPDATE nags SET next = $2',
            [123, '2018-01-01T00:00:00Z']
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

      it('should update all properties of the given nag', done => {
        db.updateNag(123, updatePayload).then(() => {
          expect(pgClient.query.calledWithMatch(
            'UPDATE nags SET name = $2,next = $3',
            [123, 'foobar', '2018-01-01T00:00:00Z']
          )).to.be.ok;
          done();
        });
      });
    });
  });
});
