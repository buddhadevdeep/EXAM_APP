const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacher.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { examRules, validateRequest } = require('../middleware/validator');
const { generateExcelReport } = require('../utils/report.util');

// Secure route logic for all teacher paths
router.use(authenticateToken);
router.use(authorizeRoles('Teacher'));

router.post('/exams', examRules, validateRequest, teacherController.createExam);
router.get('/exams', teacherController.getTeacherExams);
router.put('/exams/:examId/status', teacherController.updateExamStatus);
router.put('/exams/:examId', examRules, validateRequest, teacherController.updateExam);
router.delete('/exams/:examId', teacherController.deleteExam);
router.get('/exams/:examId', async (req, res, next) => {
  try {
    const { Exam } = require('../models/exam.model');
    const exam = await Exam.getById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }
    const questions = await Exam.getExamQuestions(req.params.examId);
    res.status(200).json({ exam, questions });
  } catch (err) {
    next(err);
  }
});

router.get('/exams/:examId/submissions', teacherController.getExamSubmissions);
router.get('/submissions/:submissionId', teacherController.getSubmissionDetails);
router.post('/submissions/:submissionId/verify', teacherController.verifySubmission);
router.post('/submissions/:submissionId/grade', teacherController.gradeSubmission);

// Export Exam Marks
router.get('/exams/:examId/export', async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { Submission, Exam } = require('../models/exam.model');
    const { Mark: MongoMark, Feedback: MongoFeedback } = require('../models/mongoose.model');

    const exam = await Exam.getById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    const submissionsList = await Submission.getSubmissionsForExam(examId);

    const subIds = submissionsList.filter(s => typeof s.id === 'number').map(s => s.id);
    const marks = await MongoMark.find({ submission_id: { $in: subIds } }).lean();
    const feedbacks = await MongoFeedback.find({ submission_id: { $in: subIds } }).lean();

    const marksSumMap = new Map();
    marks.forEach(m => {
      const current = marksSumMap.get(m.submission_id) || 0;
      marksSumMap.set(m.submission_id, current + m.marks_obtained);
    });

    const feedbackMap = new Map(feedbacks.map(f => [f.submission_id, f.comments]));

    const data = submissionsList.map(sub => {
      const statusText = sub.status === 'Draft' ? 'In Progress' : sub.status;
      const isGraded = sub.status === 'Graded';
      
      const totalScore = isGraded ? (marksSumMap.get(sub.id) || 0) : 'N/A';
      const comment = isGraded ? (feedbackMap.get(sub.id) || 'N/A') : 'N/A';
      
      const submittedDateStr = sub.submitted_at ? (() => {
        const d = new Date(sub.submitted_at);
        return isNaN(d.getTime()) ? sub.submitted_at : d.toLocaleString('en-US');
      })() : (sub.status === 'Draft' ? 'In Progress' : 'Not started yet');

      return [
        sub.student_name || 'Unknown Student',
        sub.roll_number || '',
        sub.class_section || '',
        statusText,
        submittedDateStr,
        totalScore,
        comment
      ];
    });

    const headers = ['Student Name', 'Roll Number', 'Section', 'Submission Status', 'Submitted Date', 'Score', 'Feedback'];
    await generateExcelReport(res, 'Exam Marks', headers, data);
  } catch (error) {
    next(error);
  }
});

// Student Management for Teacher
router.get('/students', teacherController.getAllStudents);
router.post('/students', teacherController.createStudent);
router.put('/students/:userId', teacherController.updateStudent);
router.delete('/students/:userId', teacherController.deleteStudent);
router.put('/students/:userId/status', teacherController.toggleStudentStatus);

module.exports = router;
