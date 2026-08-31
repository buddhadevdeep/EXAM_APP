const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/user.model');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;

    // Check duplicate logins for students
    if (decoded.role === 'Student') {
      const dbUser = await User.findById(decoded.id);
      if (!dbUser || dbUser.current_session_id !== decoded.sessionId) {
        return res.status(401).json({ message: 'Session expired. You have logged in from another device.' });
      }
      // Update last active time in database (throttled to once per 30 seconds and run in background)
      const now = new Date();
      if (!dbUser.last_active_at || (now - new Date(dbUser.last_active_at)) > 30000) {
        User.update(decoded.id, { last_active_at: now }).catch(err => {
          console.error('Failed to update student activity in background:', err.message);
        });
      }
    }

    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token.' });
  }
};

// Middleware for role-based authorization
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access forbidden. Insufficient permissions.' });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles
};
