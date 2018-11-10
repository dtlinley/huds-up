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

  updateNag: (id, nag) => clientPromise.then(client => {
    const keys = Object.keys(nag);
    const values = keys.map(key => nag[key]);
    const updateString = keys.map((key, index) => `${key} = $${index + 2}`);
    return client.query(
      `UPDATE nags SET ${updateString} WHERE id = $1`,
      [id].concat(values)
    ).catch(exception => Promise.reject(exception.message));
  }),
};
