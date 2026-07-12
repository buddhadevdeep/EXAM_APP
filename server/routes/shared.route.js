const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken } = require('../middleware/auth');

// Allow both Admins and Teachers to read subjects, categories, question banks, and questions
router.use(authenticateToken);

// Common read/write endpoints
router.get('/subjects', adminController.getSubjects);
router.get('/categories', adminController.getCategories);
router.get('/question-banks', adminController.getQuestionBanks);
router.get('/questions', adminController.getQuestions);
router.post('/questions', adminController.createQuestion);

// Edit and Delete question endpoints
router.put('/questions/:id', async (req, res, next) => {
  try {
    const { poolPromise, mssql } = require('../config/db');
    const pool = await poolPromise;
    const { title, description, points, sqlTemplate } = req.body;
    await pool.request()
      .input('id', mssql.Int, req.params.id)
      .input('title', mssql.NVarChar, title)
      .input('description', mssql.NVarChar, description)
      .input('points', mssql.Int, points)
      .input('sqlTemplate', mssql.NVarChar, sqlTemplate)
      .query(`
        UPDATE questions 
        SET title = @title, description = @description, points = @points, sql_template = @sqlTemplate 
        WHERE id = @id
      `);
    res.status(200).json({ message: 'Question updated successfully.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/questions/:id', async (req, res, next) => {
  try {
    const { poolPromise, mssql } = require('../config/db');
    const pool = await poolPromise;
    const qId = parseInt(req.params.id, 10);

    // Use separate pool.request() calls for each delete — the msnodesqlv8 driver
    // does NOT reliably share @param bindings across multiple transaction.request() calls.
    // Delete child rows first to satisfy FK constraints, then delete the parent.

    // 1. Delete marks linked to this question
    await pool.request()
      .input('qId', mssql.Int, qId)
      .query('DELETE FROM marks WHERE question_id = @qId');

    // 2. Delete submission answers linked to this question
    await pool.request()
      .input('qId', mssql.Int, qId)
      .query('DELETE FROM submission_answers WHERE question_id = @qId');

    // 3. Remove question from all exams
    await pool.request()
      .input('qId', mssql.Int, qId)
      .query('DELETE FROM exam_questions WHERE question_id = @qId');

    // 4. Finally delete the question itself
    await pool.request()
      .input('qId', mssql.Int, qId)
      .query('DELETE FROM questions WHERE id = @qId');

    res.status(200).json({ message: 'Question deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

router.get('/students', async (req, res, next) => {
  try {
    const User = require('../models/user.model');
    const students = await User.getStudents();
    res.status(200).json(students);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
