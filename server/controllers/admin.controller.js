const User = require('../models/user.model');
const { Subject, Category, QuestionBank } = require('../models/entities.model');
const { Question } = require('../models/exam.model');
const UtilityModel = require('../models/utility.model');

// Users
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.getAll();
    return res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;
    
    await User.update(userId, { is_active });
    await UtilityModel.logActivity(req.user.id, 'Toggle User Status', `Set user ID ${userId} status to ${is_active}`);
    
    return res.status(200).json({ message: 'User status updated successfully.' });
  } catch (error) {
    next(error);
  }
};

// Subjects
exports.getSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.getAll();
    return res.status(200).json(subjects);
  } catch (error) {
    next(error);
  }
};

exports.createSubject = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const insertId = await Subject.create({ name, description });
    await UtilityModel.logActivity(req.user.id, 'Create Subject', `Created subject: ${name}`);
    return res.status(201).json({ id: insertId, name, description });
  } catch (error) {
    next(error);
  }
};

// Categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.getAll();
    return res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const insertId = await Category.create({ name, description });
    await UtilityModel.logActivity(req.user.id, 'Create Category', `Created category: ${name}`);
    return res.status(201).json({ id: insertId, name, description });
  } catch (error) {
    next(error);
  }
};

// Question Banks
exports.getQuestionBanks = async (req, res, next) => {
  try {
    const questionBanks = await QuestionBank.getAll();
    return res.status(200).json(questionBanks);
  } catch (error) {
    next(error);
  }
};

exports.createQuestionBank = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const insertId = await QuestionBank.create({ name, description });
    await UtilityModel.logActivity(req.user.id, 'Create Question Bank', `Created Question Bank: ${name}`);
    return res.status(201).json({ id: insertId, name, description });
  } catch (error) {
    next(error);
  }
};

// Questions
exports.getQuestions = async (req, res, next) => {
  try {
    const questions = await Question.getAll();
    return res.status(200).json(questions);
  } catch (error) {
    next(error);
  }
};

exports.createQuestion = async (req, res, next) => {
  try {
    const { questionBankId, categoryId, subjectId, title, description, points, sqlTemplate } = req.body;
    const insertId = await Question.create({
      questionBankId, categoryId, subjectId, title, description, points, sqlTemplate
    });
    await UtilityModel.logActivity(req.user.id, 'Create Question', `Created question: ${title}`);
    return res.status(201).json({ id: insertId, title });
  } catch (error) {
    next(error);
  }
};

// Analytics & Settings
exports.getAnalytics = async (req, res, next) => {
  try {
    const { poolPromise } = require('../config/db');
    const pool = await poolPromise;

    const userCount = await pool.request().query('SELECT COUNT(*) as count FROM users');
    const examCount = await pool.request().query('SELECT COUNT(*) as count FROM exams');
    const subCount = await pool.request().query('SELECT COUNT(*) as count FROM submissions');
    const gradedCount = await pool.request().query('SELECT COUNT(*) as count FROM submissions WHERE status=\'Graded\'');
    
    // Activity logs
    const activityLogs = await UtilityModel.getActivityLogs();

    return res.status(200).json({
      metrics: {
        totalUsers: userCount.recordset[0].count,
        totalExams: examCount.recordset[0].count,
        totalSubmissions: subCount.recordset[0].count,
        gradedSubmissions: gradedCount.recordset[0].count
      },
      activityLogs
    });
  } catch (error) {
    next(error);
  }
};
