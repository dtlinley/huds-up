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
  createNag: (nag) => clientPromise.then((client) =>
    client.query(
      'INSERT INTO nags (name, interval, next) VALUES ($1, $2, $3) RETURNING *',
      [nag.name, nag.interval, nag.next]
    )
    .then((result) => result.rows[0])
    .catch((exception) => Promise.reject(exception.message))
  ),

  getNags: () => clientPromise.then(
    client => client.query('SELECT * FROM nags')
    .then(result => result.rows)
    .catch(exception => Promise.reject(exception.message))
  ),

  getNag: (id) => clientPromise.then((client) =>
    client.query('SELECT * FROM nags WHERE id = $1', [id])
    .then((result) => result.rows[0])
    .catch((exception) => Promise.reject(exception.message))
  ),

  updateNag: (id, nag) => clientPromise.then(client => {
    const keys = Object.keys(nag);
    const values = keys.map(key => nag[key]);
    const updateString = keys.map((key, index) => `${key} = $${index + 2}`);
    return client.query(
      `UPDATE nags SET ${updateString} WHERE id = $1 RETURNING *`,
      [id].concat(values)
    )
    .then((result) => result.rows[0])
    .catch(exception => Promise.reject(exception.message));
  }),

  deleteNag: (id) => clientPromise.then((client) =>
    client.query('DELETE FROM nags WHERE id = $1', [id])
    .then(() => Promise.resolve())
    .catch((exception) => Promise.reject(exception.message))
  ),
};
