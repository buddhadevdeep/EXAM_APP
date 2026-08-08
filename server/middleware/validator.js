const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const loginRules = [
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('password').notEmpty().withMessage('Password is required')
];

const registerRules = [
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('roleId').isInt().withMessage('Role ID must be an integer'),
  body('fullName').notEmpty().withMessage('Full name is required')
];

const questionRules = [
  body('questionBankId').isInt().withMessage('Question Bank ID must be an integer'),
  body('categoryId').isInt().withMessage('Category ID must be an integer'),
  body('subjectId').isInt().withMessage('Subject ID must be an integer'),
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('points').isInt({ min: 1 }).withMessage('Points must be a positive integer'),
  body('sqlTemplate').notEmpty().withMessage('SQL Template/Answer is required')
];

const examRules = [
  body('subjectId').isInt().withMessage('Subject ID must be an integer'),
  body('title').notEmpty().withMessage('Exam Title is required'),
  body('totalMarks').isInt({ min: 1 }).withMessage('Total Marks must be positive'),
  body('durationMinutes').isInt({ min: 1 }).withMessage('Duration must be positive'),
  body('questionIds').isArray({ min: 1 }).withMessage('At least one question must be selected'),
  body('allowedRollNumbers').optional().isArray().withMessage('Allowed roll numbers must be an array')
];

module.exports = {
  validateRequest,
  loginRules,
  registerRules,
  questionRules,
  examRules
};
