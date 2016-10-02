'use strict';

const fs = require('fs');

function isNumber(string) {
  const matcher = /^[0-9]*$/;
  return matcher.test(string);
}

/**
 * Backup folders are expected to take the form YYYYMMDD-HHMMSS-SEQ, where each section is a number
 *
 * @param {String} file - File or directory name
 * @return {Boolean} Whether or not the file name is likely a backup, with three numeric sequences
 * separated by hyphens
 */
function isBackup(file) {
  const split = file.split('-');
  if (split.length !== 3) {
    return false;
  }

  return isNumber(split[0]) && isNumber(split[1]) && isNumber(split[2]);
}

function dateFromBackup(backup) {
  const split = backup.split('-');
  const date = split[0];
  const time = split[1];
  const ret = new Date();

  ret.setUTCFullYear(
    parseInt(date.substring(0, 4), 10),
    parseInt(date.substring(4, 6), 10) - 1,
    parseInt(date.substring(6, 8), 10)
  );

  ret.setUTCHours(
    parseInt(time.substring(0, 2), 10),
    parseInt(time.substring(2, 4), 10),
    parseInt(time.substring(4, 6), 10)
  );

  return ret;
}

function mostRecent(files) {
  const backups = files.filter(isBackup);
  const dates = backups.map(dateFromBackup).sort((a, b) => b.getTime() - a.getTime());
  const now = new Date();
  const pastDates = dates.filter(date => now >= date);
  return pastDates[0];
}

function daysSince(date) {
  const now = new Date();
  const msSince = now - date;
  return msSince / (1000 * 60 * 60 * 24);
}

exports.register = (server, options, next) => {
  server.route({
    method: 'GET',
    path: '/plugins/back-in-time-backup',
    handler: (request, reply) => {
      if (process.env.BACKINTIME_DIR.length <= 0) {
        return reply({ priority: 0 });
      }

      return fs.readdir(process.env.BACKINTIME_DIR, (err, files) => {
        const response = { priority: 0, type: 'backup.backintime', data: {} };
        let msg;

        if (err) {
          msg = `Filesystem error while trying to read
          ${process.env.BACKINTIME_DIR}: ${err}`;

          response.priority = 90;
          response.data.message = msg;
          return reply(response);
        } else if (files.length <= 0) {
          msg = `No backups found at ${process.env.BACKINTIME_DIR}`;

          response.priority = 90;
          response.data.message = msg;
          return reply(response);
        }

        const daysSinceBackup = daysSince(mostRecent(files));

        if (daysSinceBackup <= 1) {
          response.priority = 10;
          response.data.message = 'Backed up recently';
        } else {
          const priority = 30 + (10 * Math.floor(daysSinceBackup));
          response.priority = Math.min(priority, 90);
          response.data.message = `No backup in ${Math.floor(daysSinceBackup)} days.`;
        }

        return reply(response);
      });
    },
  });

  next();
};

exports.register.attributes = {
  name: 'backInTime',
  version: '0.0.1',
};
