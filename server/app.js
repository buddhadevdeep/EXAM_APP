const express = require('express');
const path = require('path');
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
const allowedOrigins = [
  "http://localhost:5173",
  "https://sql-exam.netlify.app",
  process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, "") : ""
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Standardize origin lookup (without trailing slash)
    const normalizedOrigin = origin ? origin.replace(/\/$/, "") : "";
    if (
      !origin || 
      allowedOrigins.includes(normalizedOrigin) || 
      normalizedOrigin.endsWith(".netlify.app") ||
      normalizedOrigin.endsWith(".vercel.app")
    ) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
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

// Serve static files from the React frontend build
const distPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(distPath));

// Welcome Endpoint for API
app.get('/api', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Smart SQL Exam Platform API' });
});

// Catch-all route to serve React's index.html for page refreshes
app.get('*', (req, res, next) => {
  // If request is for an API endpoint, do not serve index.html
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
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
