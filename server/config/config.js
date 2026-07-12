require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  DB: {
    server: process.env.DB_SERVER || 'DESKTOP-IHUGRVP\\SQLEXPRESS',
    database: process.env.DB_NAME || 'smart_sql_exam',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    options: {
      encrypt: false, // For local development
      trustServerCertificate: true,
      enableArithAbort: true
    },
    // If windows authentication is used, leave user/password blank. mssql library uses Tedious which requires SQL Authentication by default.
    // However, if we configure connection strings or credentials it will attempt to log in.
    authentication: process.env.DB_USER ? {
      type: 'default',
      options: {
        userName: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      }
    } : undefined
  },
  JWT_SECRET: process.env.JWT_SECRET || 'supersecretjwtsmartsqlexamkey2026',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '24h',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
