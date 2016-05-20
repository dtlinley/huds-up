const expect = require('chai').expect;

const server = require('../server');

describe('Server', () => {
  it('should start the server', () => {
    expect(server).to.exist;
  });
});
