'import strict';

const { Client } = require('pg');

const clientPromise = new Promise((resolve, reject) => {
  const client = new Client();
  client.connect(err => {
    if (err) reject(err);

    resolve(client);
  });
});

module.exports = {
  getNags: () => clientPromise.then(
    client => client.query('SELECT * FROM nags').then(
      result => result.rows
    ).catch(exception => Promise.reject(exception.message))
  ),
};
