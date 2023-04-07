'import strict';

const { Client } = require('pg');

const client = new Client();
const clientPromise = client.connect();

module.exports = {
  createNag: (nag) => clientPromise.then(() =>
    client.query(
      'INSERT INTO nags (name, interval, next) VALUES ($1, $2, $3) RETURNING *',
      [nag.name, nag.interval, nag.next]
    )
    .then((result) => result.rows[0])
    .catch((exception) => Promise.reject(exception.message))
  ),

  getNags: () => clientPromise.then(
    () => client.query('SELECT * FROM nags')
    .then(result => result.rows)
    .catch(exception => Promise.reject(exception.message))
  ),

  getNag: (id) => clientPromise.then(() =>
    client.query('SELECT * FROM nags WHERE id = $1', [id])
    .then((result) => result.rows[0])
    .catch((exception) => Promise.reject(exception.message))
  ),

  updateNag: (id, nag) => clientPromise.then(() => {
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

  deleteNag: (id) => clientPromise.then(() =>
    client.query('DELETE FROM nags WHERE id = $1', [id])
    .then(() => Promise.resolve())
    .catch((exception) => Promise.reject(exception.message))
  ),
};
