const app = require('./app');
const config = require('./config/config');
const { dbPromise } = require('./config/db');

// Await database connection before serving standalone requests
dbPromise.then(() => {
  app.listen(config.PORT, '0.0.0.0', () => {
    console.log(`Server is running in ${config.NODE_ENV} mode on port ${config.PORT}`);
    console.log(`Network access: http://10.120.22.211:5173${config.PORT}`);
  });
}).catch(err => {
  console.error("Initialization Failed: Database connection could not be established.", err);
  process.exit(1);
});
