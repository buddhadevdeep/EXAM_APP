const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://buddhadevdeep1357_db_user:GRXIoffpFCMX3Beo@cluster0.ix64eua.mongodb.net/smart_sql_exam?retryWrites=true&w=majority',
  JWT_SECRET: process.env.JWT_SECRET || 'supersecretjwtsmartsqlexamkey2026',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '24h',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
