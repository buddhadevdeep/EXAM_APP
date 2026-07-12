const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { questionRules, validateRequest } = require('../middleware/validator');
const { generatePDFReport, generateExcelReport } = require('../utils/report.util');

// Secure route logic for all admin paths
router.use(authenticateToken);
router.use(authorizeRoles('Admin'));

// User Management
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/status', adminController.toggleUserStatus);

// Subjects
router.get('/subjects', adminController.getSubjects);
router.post('/subjects', adminController.createSubject);

// Categories
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);

// Question Banks
router.get('/question-banks', adminController.getQuestionBanks);
router.post('/question-banks', adminController.createQuestionBank);

// Questions
router.get('/questions', adminController.getQuestions);
router.post('/questions', questionRules, validateRequest, adminController.createQuestion);

// Analytics
router.get('/analytics', adminController.getAnalytics);

// Report Exports
router.get('/reports/pdf', async (req, res, next) => {
  try {
    const { User: MongoUser, Role: MongoRole } = require('../models/mongoose.model');
    const users = await MongoUser.find().lean();
    const roles = await MongoRole.find().lean();
    const roleMap = new Map(roles.map(r => [r._id, r.name]));

    const headers = ['Email', 'Role', 'Status'];
    const data = users.map(u => [
      u.email,
      roleMap.get(u.role_id) || 'Student',
      u.is_active ? 'Active' : 'Inactive'
    ]);
    generatePDFReport(res, 'Platform Users Report', headers, data);
  } catch (error) {
    next(error);
  }
});

router.get('/reports/excel', async (req, res, next) => {
  try {
    const { User: MongoUser, Role: MongoRole } = require('../models/mongoose.model');
    const users = await MongoUser.find().lean();
    const roles = await MongoRole.find().lean();
    const roleMap = new Map(roles.map(r => [r._id, r.name]));

    const headers = ['Email', 'Role', 'Status'];
    const data = users.map(u => [
      u.email,
      roleMap.get(u.role_id) || 'Student',
      u.is_active ? 'Active' : 'Inactive'
    ]);
    await generateExcelReport(res, 'Users', headers, data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
