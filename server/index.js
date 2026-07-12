const app = require('./app');
const config = require('./config/config');
require('./config/db');

app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`Server is running in ${config.NODE_ENV} mode on port ${config.PORT}`);
  console.log(`Network access: http://10.120.22.211:5173${config.PORT}`);
});
