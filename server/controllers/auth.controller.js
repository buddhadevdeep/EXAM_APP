const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config/config');
const User = require('../models/user.model');
const { Student, Teacher } = require('../models/entities.model');
const UtilityModel = require('../models/utility.model');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact administration.' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Generate JWT token
    const tokenPayload = { id: user.id, email: user.email, role: user.role_name };
    if (user.role_name === 'Student') {
      if (user.current_session_id && user.last_active_at) {
        const inactiveThresholdMs = 2 * 60 * 1000; // 2 minutes
        const isSessionActive = (Date.now() - new Date(user.last_active_at).getTime()) < inactiveThresholdMs;
        if (isSessionActive) {
          return res.status(403).json({
            message: 'Access Denied: You are already logged in on another device/browser. Please log out from that device or try again in 2 minutes.'
          });
        }
      }

      const sessionId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      await User.update(user.id, { current_session_id: sessionId, last_active_at: new Date() });
      tokenPayload.sessionId = sessionId;
    }

    const token = jwt.sign(
      tokenPayload,
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRE }
    );

    // Retrieve name context based on roles
    let name = 'Admin';
    let entityId = null;
    if (user.role_name === 'Student') {
      const student = await Student.findByUserId(user.id);
      if (student) {
        name = student.full_name;
        entityId = student.id;
      }
    } else if (user.role_name === 'Teacher') {
      const teacher = await Teacher.findByUserId(user.id);
      if (teacher) {
        name = teacher.full_name;
        entityId = teacher.id;
      }
    }

    // Log Activity
    await UtilityModel.logActivity(user.id, 'User Login', `Logged in from IP: ${req.ip}`, req.ip);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role_name,
        name,
        entityId,
        emailVerified: user.email_verified
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { email, password, roleId, fullName, rollNumber, classSection, department } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email address is already in use.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = await User.create({
      email,
      passwordHash,
      roleId,
      isActive: 1,
      emailVerified: 1 // Default to verified for easy demonstration
    });

    if (roleId === 3) {
      // Student
      await Student.create({
        userId,
        fullName,
        rollNumber: rollNumber || `ROLL-${Date.now()}`,
        classSection: classSection || 'Section A'
      });
    } else if (roleId === 2) {
      // Teacher
      await Teacher.create({
        userId,
        fullName,
        department: department || 'General Science'
      });
    }

    await UtilityModel.logActivity(userId, 'Account Registration', `New user registered as role ID ${roleId}`);

    return res.status(201).json({ message: 'Registration successful! You can now log in.' });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    let extraDetails = {};
    if (user.role_name === 'Student') {
      extraDetails = await Student.findByUserId(user.id);
    } else if (user.role_name === 'Teacher') {
      extraDetails = await Teacher.findByUserId(user.id);
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
      role: user.role_name,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      created_at: user.created_at,
      ...extraDetails
    });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await User.update(user.id, { password_hash: newHash });
    await UtilityModel.logActivity(user.id, 'Change Password', 'User successfully changed their password.');

    return res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'Student') {
      await User.update(req.user.id, { current_session_id: null, last_active_at: null });
    }
    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role_name !== 'Teacher') {
      return res.status(403).json({ message: 'Only teachers can update their profile name.' });
    }

    await Teacher.update(user.id, { fullName });
    await UtilityModel.logActivity(user.id, 'Update Profile', `User updated their full name to ${fullName}`);

    return res.status(200).json({ message: 'Profile updated successfully.', name: fullName });
  } catch (error) {
    next(error);
  }
};

