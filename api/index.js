const app = require('../server/app');
const { dbPromise } = require('../server/config/db');

module.exports = async (req, res) => {
  // Ensure the database connects before handling the request in serverless
  await dbPromise;
  return app(req, res);
};
