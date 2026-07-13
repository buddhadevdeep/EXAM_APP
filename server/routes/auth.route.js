const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth');
const { loginRules, registerRules, validateRequest } = require('../middleware/validator');

router.post('/login', loginRules, validateRequest, authController.login);
router.post('/register', registerRules, validateRequest, authController.register);
router.get('/profile', authenticateToken, authController.getProfile);
router.post('/change-password', authenticateToken, authController.changePassword);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
