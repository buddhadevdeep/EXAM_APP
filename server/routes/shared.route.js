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
    const { Question: MongoQuestion } = require('../models/mongoose.model');
    const { title, description, points, sqlTemplate } = req.body;
    await MongoQuestion.findByIdAndUpdate(req.params.id, {
      $set: { title, description, points, sql_template: sqlTemplate }
    });
    res.status(200).json({ message: 'Question updated successfully.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/questions/:id', async (req, res, next) => {
  try {
    const { Question: MongoQuestion, ExamQuestion: MongoExamQuestion, SubmissionAnswer: MongoSubmissionAnswer, Mark: MongoMark } = require('../models/mongoose.model');
    const qId = parseInt(req.params.id, 10);

    await MongoMark.deleteMany({ question_id: qId });
    await MongoSubmissionAnswer.deleteMany({ question_id: qId });
    await MongoExamQuestion.deleteMany({ question_id: qId });
    await MongoQuestion.deleteOne({ _id: qId });

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
