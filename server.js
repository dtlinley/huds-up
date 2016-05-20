const Hapi = require('hapi');

const server = new Hapi.Server();
server.connection({ port: process.env.PORT || 8080 });

server.start(err => {
  if (err) {
    throw err;
  }

  console.log(`Server running at ${server.info.uri}`); // eslint-disable-line no-console
});

module.exports = server;
