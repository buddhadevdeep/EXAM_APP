const express = require('express');
const router = express.Router();
const controller = require('../controllers/sqlPractice.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Require authentication for all paths
router.use(authenticateToken);

// ==========================================
// Teacher SQL Databases
// ==========================================
router.post('/databases', authorizeRoles('Teacher'), controller.createDatabase);
router.get('/databases', authorizeRoles('Teacher'), controller.getDatabases);
router.get('/databases/:id', authorizeRoles('Teacher', 'Student'), controller.getDatabaseDetails);
router.put('/databases/:id', authorizeRoles('Teacher'), controller.updateDatabase);
router.delete('/databases/:id', authorizeRoles('Teacher'), controller.deleteDatabase);

// ==========================================
// Teacher SQL Assignments
// ==========================================
router.post('/assignments', authorizeRoles('Teacher'), controller.createAssignment);
router.get('/assignments', authorizeRoles('Teacher'), controller.getAssignments);
router.get('/assignments/:id', authorizeRoles('Teacher'), controller.getAssignmentDetails);
router.put('/assignments/:id', authorizeRoles('Teacher'), controller.updateAssignment);
router.delete('/assignments/:id', authorizeRoles('Teacher'), controller.deleteAssignment);

// ==========================================
// Student Submissions & Queries
// ==========================================
router.get('/student/assignments', authorizeRoles('Student'), controller.getStudentAssignments);
router.get('/student/assignments/:id', authorizeRoles('Student'), controller.getStudentAssignmentDetails);
router.post('/submissions/save-draft', authorizeRoles('Student'), controller.saveStudentDraft);
router.post('/submissions/submit', authorizeRoles('Student'), controller.submitStudentAssignment);
router.get('/student/submissions', authorizeRoles('Student'), controller.getStudentSubmissionHistory);

// ==========================================
// Teacher Reviews & Grading
// ==========================================
router.get('/submissions/review', authorizeRoles('Teacher'), controller.getSubmissionsForReview);
router.get('/submissions/review/:id', authorizeRoles('Teacher', 'Student'), controller.getSubmissionDetailForReview);
router.post('/submissions/review/:id', authorizeRoles('Teacher'), controller.gradeSubmissionManually);

module.exports = router;
