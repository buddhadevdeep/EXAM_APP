const { Exam, Submission, Grade } = require('../models/exam.model');
const { Teacher } = require('../models/entities.model');
const UtilityModel = require('../models/utility.model');

exports.createExam = async (req, res, next) => {
  try {
    const { subjectId, title, description, totalMarks, durationMinutes, questionIds, accessCode, startTime, endTime, allowedRollNumbers, databaseSchema, examType } = req.body;
    
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
      endTime: endTime || null,
      allowedRollNumbers: allowedRollNumbers || [],
      databaseSchema: databaseSchema || '',
      examType: examType || 'Exam'
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
    const { subjectId, title, description, totalMarks, durationMinutes, questionIds, accessCode, startTime, endTime, allowedRollNumbers, databaseSchema, examType } = req.body;

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
      end_time: endTime || null,
      allowed_roll_numbers: allowedRollNumbers,
      database_schema: databaseSchema,
      exam_type: examType
    });

    // 2. Refresh linked exam questions
    if (questionIds) {
      const { ExamQuestion: MongoExamQuestion } = require('../models/mongoose.model');
      // Delete old questions mapping
      await MongoExamQuestion.deleteMany({ exam_id: examId });

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

    const { Exam: MongoExam, Subject: MongoSubject } = require('../models/mongoose.model');
    const exams = await MongoExam.find({ teacher_id: teacher.id }).lean();
    const subjectIds = exams.map(e => e.subject_id);
    const subjects = await MongoSubject.find({ _id: { $in: subjectIds } }).lean();
    const subjectMap = new Map(subjects.map(s => [s._id, s.name]));

    const mapped = exams.map(e => {
      const isExpired = e.end_time && new Date() > new Date(e.end_time);
      return {
        ...e,
        id: e._id,
        is_published: isExpired ? 0 : e.is_published,
        subject_name: subjectMap.get(e.subject_id) || ''
      };
    });

    return res.status(200).json(mapped);
  } catch (error) {
    next(error);
  }
};

exports.updateExamStatus = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { isPublished, isClosed } = req.body;

    const { Exam: MongoExam } = require('../models/mongoose.model');
    const existingExam = await MongoExam.findById(examId).lean();
    if (!existingExam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    const updates = {};
    if (isPublished !== undefined) updates.is_published = isPublished ? 1 : 0;
    if (isClosed !== undefined) updates.is_closed = isClosed ? 1 : 0;

    await Exam.update(examId, updates);

    // If reopening (transition from closed to open), reset existing submissions to Draft state and clear previous answer history so students start fresh
    if (existingExam.is_closed === 1 && isClosed === 0) {
      const { Submission: MongoSubmission, SubmissionAnswer: MongoSubmissionAnswer } = require('../models/mongoose.model');
      
      // Get all submission IDs for this exam
      const submissions = await MongoSubmission.find({ exam_id: examId }).lean();
      const subIds = submissions.map(sub => sub._id);
      if (subIds.length > 0) {
        // Clear previous answers
        await MongoSubmissionAnswer.deleteMany({ submission_id: { $in: subIds } });
      }
      
      // Reset submission status to Draft
      await MongoSubmission.updateMany({ exam_id: examId }, { $set: { status: 'Draft', submitted_at: null } });
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
      const { Student: MongoStudent } = require('../models/mongoose.model');
      const studentDoc = await MongoStudent.findById(details.student_id).lean();

      if (studentDoc) {
        await UtilityModel.createNotification(
          studentDoc.user_id,
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

    const { Student: MongoStudent } = require('../models/entities.model');
    await MongoStudent.create({
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
    const { Student: MongoStudent } = require('../models/mongoose.model');
    await MongoStudent.updateOne(
      { user_id: userId },
      { $set: { full_name: fullName, roll_number: rollNumber, class_section: classSection } }
    );

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
    
    const { Submission: MongoSubmission, SubmissionAnswer: MongoSubmissionAnswer, Mark: MongoMark, Feedback: MongoFeedback, ExamQuestion: MongoExamQuestion, Exam: MongoExam } = require('../models/mongoose.model');
    
    const submissions = await MongoSubmission.find({ exam_id: examId }).lean();
    const subIds = submissions.map(s => s._id);
    if (subIds.length > 0) {
      await MongoSubmissionAnswer.deleteMany({ submission_id: { $in: subIds } });
      await MongoMark.deleteMany({ submission_id: { $in: subIds } });
      await MongoFeedback.deleteMany({ submission_id: { $in: subIds } });
      await MongoSubmission.deleteMany({ exam_id: examId });
    }
    await MongoExamQuestion.deleteMany({ exam_id: examId });
    await MongoExam.deleteOne({ _id: examId });

    await UtilityModel.logActivity(req.user.id, 'Delete Exam', `Deleted exam ID ${examId}`);
    return res.status(200).json({ message: 'Exam deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.verifySubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { Submission: MongoSubmission } = require('../models/mongoose.model');
    const submission = await MongoSubmission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    if (submission.status === 'Submitted') {
      return res.status(400).json({ message: 'Exam has already been verified and submitted.' });
    }

    // Update status to Submitted
    submission.status = 'Submitted';
    submission.submitted_at = Date.now();
    await submission.save();

    await UtilityModel.logActivity(req.user.id, 'Exam Submission Verified', `Teacher verified submission ID ${submissionId}`);

    return res.status(200).json({ message: 'Exam submission verified successfully!' });
  } catch (error) {
    next(error);
  }
};
