const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);
router.use(authorizeRoles('Student'));

router.get('/exams', studentController.getAvailableExams);
router.get('/exams/:examId', studentController.getExamDetails);
router.post('/exams/save-draft', studentController.saveAnswerDraft);
router.post('/exams/request-verification', studentController.requestVerification);
router.get('/exams/submission-status/:submissionId', studentController.getSubmissionStatus);
router.post('/exams/submit', studentController.submitExam);
router.get('/submissions', studentController.getStudentSubmissions);
router.get('/notifications', studentController.getNotifications);

module.exports = router;
