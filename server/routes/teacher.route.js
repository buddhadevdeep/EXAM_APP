const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacher.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { examRules, validateRequest } = require('../middleware/validator');
const { generateExcelReport } = require('../utils/report.util');
const pool = require('../config/db');

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
    const { poolPromise, mssql } = require('../config/db');
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('examId', mssql.Int, examId)
      .query(`
        SELECT s.full_name, s.roll_number, sub.status, f.comments,
               COALESCE(SUM(m.marks_obtained), 0) as total_score
        FROM submissions sub
        JOIN students s ON sub.student_id = s.id
        LEFT JOIN marks m ON sub.id = m.submission_id
        LEFT JOIN feedback f ON sub.id = f.submission_id
        WHERE sub.exam_id = @examId
        GROUP BY sub.id, s.full_name, s.roll_number, sub.status, f.comments
      `);

    const headers = ['Full Name', 'Roll Number', 'Status', 'Score', 'Feedback'];
    const data = result.recordset.map(m => [m.full_name, m.roll_number, m.status, m.total_score, m.comments || 'N/A']);
    
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
