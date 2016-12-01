const Hapi = require('hapi');
const fs = require('fs');
const wreck = require('wreck');
const dotenv = require('dotenv');

dotenv.config({ silent: true });
const plugins = [];
const port = process.env.PORT;
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
          wreck.get(`${srv.info.uri}/plugins/${plugin}`, null, (err, response, payload) => {
            if (err) {
              return reject(err);
            }
            return resolve(JSON.parse(payload));
          });
        }));
      });
      Promise.all(promises).then(
        responses => reply(
          responses
          .filter(response => response.priority > 0)
          .sort((a, b) => b.priority - a.priority)
        ),
        error => reply(`Error encountered while loading plugins:
          ${error.statusCode} ${error.statusMessage} ${error.req.path}`)
      );
    },
  });
});

promise.catch(error => {
  console.error(error); // eslint-disable-line no-console
});

module.exports = promise;
