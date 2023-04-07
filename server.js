const dotenv = require('dotenv');
const inert = require('@hapi/inert');
const handlebars = require('handlebars');
const Hapi = require('@hapi/hapi');
const views = require('./views/index.js');
const vision = require('@hapi/vision');
const wreck = require('@hapi/wreck');
const fs = require('node:fs/promises');

dotenv.config({ silent: true });
const plugins = [];
const port = process.env.PORT;

const init = async () => {
  const server = new Hapi.Server({
    port,
    host: 'localhost',
  });
  
  await server.start();
  console.log(`Server running on %s`, server.info.uri);

  server.register(vision);
  server.register(inert);

  server.views({
    engines: { html: handlebars },
    relativeTo: __dirname,
    path: 'views',
  });
  server.register(views.plugin);

  server.events.on('log', (event, tags) => {
    const date = (new Date(event.timestamp)).toISOString();
    console.log(`${date} - ${JSON.stringify(tags)} ${event.data}`); // eslint-disable-line no-console
  });

  const pluginFiles = await fs.readdir('./plugins');
  pluginFiles.forEach(file => {
    const name = file.replace(/\.js/g, '');
    plugins.push(name);
    const plugin = require(`./plugins/${name}`); // eslint-disable-line global-require
    server.register(plugin.plugin);
  });

  server.route({
    method: 'GET',
    path: '/plugins',
    handler: (request, reply) => {
      const promises = [];
      plugins.forEach(plugin => {
        promises.push(new Promise((resolve, reject) => {
          wreck.get(`http://localhost:9010/plugins/${plugin}`).then((response) => {
            return resolve(JSON.parse(response.payload));
          });
        }));
      });
      return Promise.all(promises).then(
        responses => 
            responses
            .reduce((acc, val) => acc.concat(val), [])
            .filter(response => response.priority > 0)
            .sort((a, b) => b.priority - a.priority)
        ,
        error => `Error encountered while loading plugins: ${error}`
      );
    },
  });

  // server.events.on('request-internal', (request) => {
  //   if (process.env.NODE_ENV !== 'test') {
  //     server.log(['info'], `#${request.method} ${request.path}`);
  //   }
  // });
};

init();
