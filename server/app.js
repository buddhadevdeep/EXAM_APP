const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/error');
const config = require('./config/config');

const authRoutes = require('./routes/auth.route');
const adminRoutes = require('./routes/admin.route');
const teacherRoutes = require('./routes/teacher.route');
const studentRoutes = require('./routes/student.route');
const sharedRoutes = require('./routes/shared.route');

const app = express();

// Secure headers
app.use(helmet());

// Logging
app.use(morgan('dev'));

// CORS configuration
app.use(cors({
  origin: '*', // For development. Can restrict in production.
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Higher threshold for local developer testing and auto-saves
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api', limiter);

// Request Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routing API endpoints
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/shared', sharedRoutes);

// Welcome Endpoint
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Smart SQL Exam Platform API' });
});

// Handling 404 Route Errors
app.use((req, res, next) => {
  const error = new Error('Resource Not Found');
  error.statusCode = 404;
  next(error);
});

// Express Error Handler
app.use(errorHandler);

module.exports = app;
