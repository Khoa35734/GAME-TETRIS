/*
  This file exists to avoid Node resolving src/server.js instead of src/server.ts during dev.
  It simply re-exports the TypeScript module when running via ts-node, and falls back to the
  compiled dist file when running compiled JavaScript.
*/
/* eslint-disable */
try {
  module.exports = require('./server.ts');
} catch (e) {
  try {
    module.exports = require('../dist/server.js');
  } catch (err) {
    throw e;
  }
}