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
    const { Submission: MongoSubmission, Student: MongoStudent, Mark: MongoMark, Feedback: MongoFeedback } = require('../models/mongoose.model');

    const submissions = await MongoSubmission.find({ exam_id: examId }).lean();
    const studentIds = submissions.map(s => s.student_id);
    const students = await MongoStudent.find({ _id: { $in: studentIds } }).lean();
    const studentMap = new Map(students.map(s => [s._id, s]));

    const subIds = submissions.map(s => s._id);
    const marks = await MongoMark.find({ submission_id: { $in: subIds } }).lean();
    const feedbacks = await MongoFeedback.find({ submission_id: { $in: subIds } }).lean();

    const marksSumMap = new Map();
    marks.forEach(m => {
      const current = marksSumMap.get(m.submission_id) || 0;
      marksSumMap.set(m.submission_id, current + m.marks_obtained);
    });

    const feedbackMap = new Map(feedbacks.map(f => [f.submission_id, f.comments]));

    const data = submissions.map(sub => {
      const s = studentMap.get(sub.student_id) || {};
      const totalScore = marksSumMap.get(sub._id) || 0;
      const comment = feedbackMap.get(sub._id) || 'N/A';
      return [
        s.full_name || '',
        s.roll_number || '',
        sub.status,
        totalScore,
        comment
      ];
    });

    const headers = ['Full Name', 'Roll Number', 'Status', 'Score', 'Feedback'];
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
