const { Exam, Submission, Grade } = require('../models/exam.model');
const { Student } = require('../models/entities.model');
const UtilityModel = require('../models/utility.model');
const pool = require('../config/db');

exports.getAvailableExams = async (req, res, next) => {
  try {
    const student = await Student.findByUserId(req.user.id);
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const { poolPromise, mssql } = require('../config/db');
    const pool = await poolPromise;

    // Get all published exams
    const result = await pool.request()
      .input('studentId', mssql.Int, student.id)
      .input('now', mssql.DateTime, new Date())
      .query(`
        SELECT e.*, s.name as subject_name, t.full_name as teacher_name,
               sub.status as submission_status, sub.id as submission_id
        FROM exams e
        JOIN subjects s ON e.subject_id = s.id
        JOIN teachers t ON e.teacher_id = t.id
        LEFT JOIN submissions sub ON e.id = sub.exam_id AND sub.student_id = @studentId
        WHERE e.is_published = 1 AND e.is_closed = 0
          AND (e.end_time IS NULL OR e.end_time > @now)
      `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    next(error);
  }
};

exports.getExamDetails = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.getById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }
    if (!exam.is_published) {
      return res.status(403).json({ message: 'This exam is not active or has been unpublished.' });
    }

    const student = await Student.findByUserId(req.user.id);
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    // Verify timeline bounds
    const now = new Date();
    if (exam.start_time && new Date(exam.start_time) > now) {
      return res.status(403).json({ message: 'This exam is not active yet.' });
    }
    if (exam.end_time && new Date(exam.end_time) < now) {
      return res.status(403).json({ message: 'The access timeline for this exam has expired.' });
    }

    // Verify passcode if configured
    const clientCode = req.query.code;
    if (exam.access_code && exam.access_code !== clientCode) {
      return res.status(403).json({ message: 'Invalid exam entry passcode. Access Denied.' });
    }

    // Create or get submission draft
    const submission = await Submission.createDraftOrGet(student.id, examId);

    // If final submission is already done, return answers too
    const questions = await Exam.getExamQuestions(examId);
    const answers = await Submission.getAnswers(submission.id);

    return res.status(200).json({
      exam,
      submission,
      questions: questions.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        points: q.points
      })), // Hide solution templates from students
      answers
    });
  } catch (error) {
    next(error);
  }
};

exports.saveAnswerDraft = async (req, res, next) => {
  try {
    const { submissionId, questionId, sqlQuery } = req.body;
    const { poolPromise, mssql } = require('../config/db');
    const pool = await poolPromise;
    
    // Safety check: is submission already closed?
    const check = await pool.request()
      .input('submissionId', mssql.Int, submissionId)
      .query('SELECT status FROM submissions WHERE id = @submissionId');

    if (check.recordset.length > 0 && check.recordset[0].status !== 'Draft') {
      return res.status(400).json({ message: 'Submission is locked. You cannot edit completed exams.' });
    }

    await Submission.saveAnswer(submissionId, questionId, sqlQuery);
    return res.status(200).json({ message: 'Draft saved successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.submitExam = async (req, res, next) => {
  try {
    const { submissionId } = req.body;
    const { poolPromise, mssql } = require('../config/db');
    const pool = await poolPromise;

    const check = await pool.request()
      .input('submissionId', mssql.Int, submissionId)
      .query('SELECT status FROM submissions WHERE id = @submissionId');

    if (check.recordset.length > 0 && check.recordset[0].status !== 'Draft') {
      return res.status(400).json({ message: 'Exam has already been submitted.' });
    }

    await Submission.submitExam(submissionId);
    await UtilityModel.logActivity(req.user.id, 'Exam Submission', `Submitted exam for submission ID ${submissionId}`);

    return res.status(200).json({ message: 'Exam submitted successfully!' });
  } catch (error) {
    next(error);
  }
};

exports.getStudentSubmissions = async (req, res, next) => {
  try {
    const student = await Student.findByUserId(req.user.id);
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const submissions = await Submission.getSubmissionsForStudent(student.id);
    return res.status(200).json(submissions);
  } catch (error) {
    next(error);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await UtilityModel.getNotifications(req.user.id);
    return res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
};

exports.requestVerification = async (req, res, next) => {
  try {
    const { submissionId } = req.body;
    const { poolPromise, mssql } = require('../config/db');
    const pool = await poolPromise;

    const check = await pool.request()
      .input('submissionId', mssql.Int, submissionId)
      .query('SELECT status FROM submissions WHERE id = @submissionId');

    if (check.recordset.length === 0) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    if (check.recordset[0].status === 'Submitted') {
      return res.status(400).json({ message: 'Exam has already been submitted.' });
    }

    await pool.request()
      .input('submissionId', mssql.Int, submissionId)
      .query("UPDATE submissions SET status = 'PendingVerification' WHERE id = @submissionId");

    await UtilityModel.logActivity(req.user.id, 'Exam Verification Requested', `Requested QR verification for submission ID ${submissionId}`);

    return res.status(200).json({ message: 'Verification requested. Please present the QR code to your teacher.' });
  } catch (error) {
    next(error);
  }
};

exports.getSubmissionStatus = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { poolPromise, mssql } = require('../config/db');
    const pool = await poolPromise;

    const result = await pool.request()
      .input('submissionId', mssql.Int, submissionId)
      .query('SELECT status FROM submissions WHERE id = @submissionId');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    return res.status(200).json({ status: result.recordset[0].status });
  } catch (error) {
    next(error);
  }
};
