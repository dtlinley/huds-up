'use strict';

const expect = require('chai').expect;
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

describe.only('Database', () => {
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
      it('should reject with the error');
    });
  });
});
