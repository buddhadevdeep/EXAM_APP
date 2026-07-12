const { Exam, Submission, Grade } = require('../models/exam.model');
const { Teacher } = require('../models/entities.model');
const UtilityModel = require('../models/utility.model');
const pool = require('../config/db');

exports.createExam = async (req, res, next) => {
  try {
    const { subjectId, title, description, totalMarks, durationMinutes, questionIds, accessCode, startTime, endTime } = req.body;
    
    // Get teacher context
    const teacher = await Teacher.findByUserId(req.user.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found.' });
    }

    const examId = await Exam.create({
      teacherId: teacher.id,
      subjectId,
      title,
      description,
      totalMarks,
      durationMinutes,
      accessCode,
      startTime: startTime || null,
      endTime: endTime || null
    });

    if (questionIds && questionIds.length > 0) {
      await Exam.addQuestions(examId, questionIds);
    }

    await UtilityModel.logActivity(req.user.id, 'Create Exam', `Created exam ID ${examId}: ${title}`);

    return res.status(201).json({ message: 'Exam created successfully!', examId });
  } catch (error) {
    next(error);
  }
};

exports.updateExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { subjectId, title, description, totalMarks, durationMinutes, questionIds, accessCode, startTime, endTime } = req.body;

    const teacher = await Teacher.findByUserId(req.user.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found.' });
    }

    // 1. Update basic exam configurations
    await Exam.update(examId, {
      subject_id: subjectId,
      title,
      description,
      total_marks: totalMarks,
      duration_minutes: durationMinutes,
      access_code: accessCode,
      start_time: startTime || null,
      end_time: endTime || null
    });

    // 2. Refresh linked exam questions
    if (questionIds) {
      const { poolPromise, mssql } = require('../config/db');
      const pool = await poolPromise;
      // Delete old questions mapping
      await pool.request()
        .input('examId', mssql.Int, examId)
        .query('DELETE FROM exam_questions WHERE exam_id = @examId');

      // Insert new questions mapping
      if (questionIds.length > 0) {
        await Exam.addQuestions(examId, questionIds);
      }
    }

    await UtilityModel.logActivity(req.user.id, 'Update Exam', `Updated configurations for exam ID ${examId}`);
    return res.status(200).json({ message: 'Exam updated successfully!' });
  } catch (error) {
    next(error);
  }
};

exports.getTeacherExams = async (req, res, next) => {
  try {
    const teacher = await Teacher.findByUserId(req.user.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found.' });
    }

    const { poolPromise, mssql } = require('../config/db');
    const pool = await poolPromise;

    const result = await pool.request()
      .input('teacherId', mssql.Int, teacher.id)
      .query(`
        SELECT e.*, s.name as subject_name 
        FROM exams e 
        JOIN subjects s ON e.subject_id = s.id 
        WHERE e.teacher_id = @teacherId
      `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    next(error);
  }
};

exports.updateExamStatus = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { isPublished, isClosed } = req.body;
    const updates = {};
    if (isPublished !== undefined) updates.is_published = isPublished ? 1 : 0;
    if (isClosed !== undefined) updates.is_closed = isClosed ? 1 : 0;

    await Exam.update(examId, updates);

    // If reopening, reset existing submissions to Draft state and clear previous answer history so students start fresh
    if (isClosed === 0) {
      const { poolPromise, mssql } = require('../config/db');
      const pool = await poolPromise;
      
      // Get all submission IDs for this exam
      const subRes = await pool.request()
        .input('examId', mssql.Int, examId)
        .query("SELECT id FROM submissions WHERE exam_id = @examId");
      
      const subIds = subRes.recordset.map(r => r.id);
      if (subIds.length > 0) {
        // Clear previous answers
        await pool.request()
          .query(`DELETE FROM submission_answers WHERE submission_id IN (${subIds.join(',')})`);
      }
      
      // Reset submission status to Draft
      await pool.request()
        .input('examId', mssql.Int, examId)
        .query("UPDATE submissions SET status = 'Draft' WHERE exam_id = @examId");
    }

    await UtilityModel.logActivity(req.user.id, 'Update Exam Status', `Exam ID ${examId} status updated: ${JSON.stringify(updates)}`);

    return res.status(200).json({ message: 'Exam status updated successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.getExamSubmissions = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const submissions = await Submission.getSubmissionsForExam(examId);
    return res.status(200).json(submissions);
  } catch (error) {
    next(error);
  }
};

exports.getSubmissionDetails = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const details = await Submission.getSubmissionDetails(submissionId);
    if (!details) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    const answers = await Submission.getAnswers(submissionId);
    const grades = await Grade.getGrades(submissionId);
    const overallFeedback = await Grade.getOverallFeedback(submissionId);

    // Fetch original questions mapping
    const questions = await Exam.getExamQuestions(details.exam_id);

    return res.status(200).json({
      submission: details,
      answers,
      grades,
      overallFeedback,
      questions
    });
  } catch (error) {
    next(error);
  }
};

exports.gradeSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { grades, overallFeedback } = req.body; // grades: [{ questionId, marksObtained, feedback }]
    
    const teacher = await Teacher.findByUserId(req.user.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found.' });
    }

    // Save individual question grades
    for (const g of grades) {
      await Grade.saveMarkAndFeedback(submissionId, g.questionId, teacher.id, g.marksObtained, g.feedback);
    }

    // Save overall exam feedback & mark graded
    await Grade.saveOverallFeedback(submissionId, teacher.id, overallFeedback);

    // Notify Student
    const details = await Submission.getSubmissionDetails(submissionId);
    if (details) {
      const { poolPromise, mssql } = require('../config/db');
      const pool = await poolPromise;
      const studentUser = await pool.request()
        .input('studentId', mssql.Int, details.student_id)
        .query('SELECT user_id FROM students WHERE id = @studentId');

      if (studentUser.recordset.length > 0) {
        await UtilityModel.createNotification(
          studentUser.recordset[0].user_id,
          'Exam Graded',
          `Your submission for "${details.exam_title}" has been graded. Marks: ${overallFeedback ? 'Overall feedback provided' : 'View breakdown'}`
        );
      }
    }

    await UtilityModel.logActivity(req.user.id, 'Grade Submission', `Graded submission ID ${submissionId}`);

    return res.status(200).json({ message: 'Grading complete and published.' });
  } catch (error) {
    next(error);
  }
};

const User = require('../models/user.model');
const { Student } = require('../models/entities.model');
const bcrypt = require('bcrypt');

exports.getAllStudents = async (req, res, next) => {
  try {
    const students = await User.getStudents();
    return res.status(200).json(students);
  } catch (err) {
    next(err);
  }
};

exports.createStudent = async (req, res, next) => {
  try {
    const { email, password, fullName, rollNumber, classSection } = req.body;
    
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email address is already in use.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = await User.create({
      email,
      passwordHash,
      roleId: 3, // Student
      isActive: 1,
      emailVerified: 1
    });

    await Student.create({
      userId,
      fullName,
      rollNumber,
      classSection
    });

    await UtilityModel.logActivity(req.user.id, 'Create Student', `Created student: ${fullName} (${email})`);
    return res.status(201).json({ message: 'Student registered successfully!' });
  } catch (err) {
    next(err);
  }
};

exports.updateStudent = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { email, password, fullName, rollNumber, classSection } = req.body;

    // Update user details
    const updates = { email };
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updates.password_hash = await bcrypt.hash(password, salt);
    }
    await User.update(userId, updates);

    // Update student details
    const { poolPromise, mssql } = require('../config/db');
    const pool = await poolPromise;
    await pool.request()
      .input('userId', mssql.Int, userId)
      .input('fullName', mssql.NVarChar, fullName)
      .input('rollNumber', mssql.NVarChar, rollNumber)
      .input('classSection', mssql.NVarChar, classSection)
      .query(`
        UPDATE students 
        SET full_name = @fullName, roll_number = @rollNumber, class_section = @classSection 
        WHERE user_id = @userId
      `);

    await UtilityModel.logActivity(req.user.id, 'Update Student', `Updated student ID ${userId}: ${fullName}`);
    return res.status(200).json({ message: 'Student updated successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.deleteStudent = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await User.delete(userId);
    await UtilityModel.logActivity(req.user.id, 'Delete Student', `Deleted student user ID ${userId}`);
    return res.status(200).json({ message: 'Student deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.toggleStudentStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;
    
    await User.update(userId, { is_active });
    await UtilityModel.logActivity(req.user.id, 'Toggle Student Status', `Set student ID ${userId} status to ${is_active}`);
    return res.status(200).json({ message: 'Student status updated successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.deleteExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { poolPromise, mssql } = require('../config/db');
    const pool = await poolPromise;
    
    // Delete submissions for this exam first (cascades answers, marks, feedback)
    await pool.request()
      .input('examId', mssql.Int, examId)
      .query('DELETE FROM submissions WHERE exam_id = @examId');

    // Delete questions mappings for this exam
    await pool.request()
      .input('examId', mssql.Int, examId)
      .query('DELETE FROM exam_questions WHERE exam_id = @examId');

    // Delete the exam
    await pool.request()
      .input('examId', mssql.Int, examId)
      .query('DELETE FROM exams WHERE id = @examId');

    await UtilityModel.logActivity(req.user.id, 'Delete Exam', `Deleted exam ID ${examId}`);
    return res.status(200).json({ message: 'Exam deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.verifySubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { poolPromise, mssql } = require('../config/db');
    const pool = await poolPromise;

    const check = await pool.request()
      .input('submissionId', mssql.Int, submissionId)
      .query('SELECT status FROM submissions WHERE id = @submissionId');

    if (check.recordset.length === 0) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    if (check.recordset[0].status === 'Submitted') {
      return res.status(400).json({ message: 'Exam has already been verified and submitted.' });
    }

    // Update status to Submitted
    await pool.request()
      .input('submissionId', mssql.Int, submissionId)
      .query("UPDATE submissions SET status = 'Submitted', submitted_at = GETDATE() WHERE id = @submissionId");

    await UtilityModel.logActivity(req.user.id, 'Exam Submission Verified', `Teacher verified submission ID ${submissionId}`);

    return res.status(200).json({ message: 'Exam submission verified successfully!' });
  } catch (error) {
    next(error);
  }
};

