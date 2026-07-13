const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/user.model');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

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
