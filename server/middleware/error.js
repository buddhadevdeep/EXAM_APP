const config = require('../config/config');

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  const status = err.statusCode || 500;
  const message = config.NODE_ENV === 'production' 
    ? 'An unexpected error occurred.' 
    : err.message || 'Internal Server Error';

  res.status(status).json({
    status: 'error',
    statusCode: status,
    message: message,
    ...(config.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = errorHandler;
