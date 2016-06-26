const Hapi = require('hapi');
const http = require('http');
const fs = require('fs');

const plugins = [];
const port = process.env.port || 8080;
const server = new Hapi.Server();
server.connection({ port });

const promise = new Promise((resolve, reject) => {
  server.start(serverErr => {
    if (serverErr) {
      reject(serverErr);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`Server running at ${server.info.uri}`); // eslint-disable-line no-console
    }

    fs.readdir('./plugins', (fsErr, files) => {
      if (fsErr) {
        return reject(fsErr);
      }

      files.forEach(file => {
        const name = file.replace(/\.js/g, '');
        plugins.push(name);
        server.register(require(`./plugins/${name}`)); // eslint-disable-line global-require
      });
      return resolve(server);
    });
  });
});

promise.then(srv => {
  srv.route({
    method: 'GET',
    path: '/plugins',
    handler: (request, reply) => {
      const promises = [];
      plugins.forEach(plugin => {
        promises.push(new Promise((resolve, reject) => {
          http.get({
            path: `/plugins/${plugin}`,
            port,
          }, (error, result) => {
            if (error) {
              return reject(error);
            }
            return resolve(result);
          });
        }));
      });
      Promise.all(promises).then(
        responses => reply(responses.sort((a, b) => b.priority - a.priority)),
        error => reply(`Error encountered while loading plugins: ${error}`)
      );
    },
  });
});

promise.catch(error => {
  console.error(error); // eslint-disable-line no-console
});

module.exports = promise;
