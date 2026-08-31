const mongoose = require('mongoose');
const alasql = require('alasql');
const { validateSqlQuery } = require('../utils/sqlValidator');
// Configure alaSQL for case-insensitive table/column handling
alasql.options.casesensitive = false;

const { 
  SqlDatabase, 
  SqlAssignment, 
  SqlSubmission, 
  Teacher, 
  Student,
  getNextSequenceValue
} = require('../models/mongoose.model');

// Helper to compare SQL results structurally & valuation-wise
function compareSqlResults(resA, resB, hasOrderBy) {
  if (!Array.isArray(resA) || !Array.isArray(resB)) return false;
  if (resA.length !== resB.length) return false;
  if (resA.length === 0) return true;

  const cleanRow = (row) => {
    const obj = {};
    for (const k of Object.keys(row)) {
      const val = row[k];
      obj[k.toLowerCase()] = val === null || val === undefined ? null : String(val).trim().toLowerCase();
    }
    return obj;
  };

  const cleanA = resA.map(cleanRow);
  const cleanB = resB.map(cleanRow);

  const keysA = Object.keys(cleanA[0]);
  const keysB = Object.keys(cleanB[0]);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!keysB.includes(k)) return false;
  }

  if (hasOrderBy) {
    for (let i = 0; i < cleanA.length; i++) {
      for (const k of keysA) {
        if (cleanA[i][k] !== cleanB[i][k]) return false;
      }
    }
    return true;
  } else {
    const sortFn = (x, y) => {
      const sx = JSON.stringify(Object.keys(x).sort().map(k => x[k]));
      const sy = JSON.stringify(Object.keys(y).sort().map(k => y[k]));
      return sx.localeCompare(sy);
    };
    cleanA.sort(sortFn);
    cleanB.sort(sortFn);
    for (let i = 0; i < cleanA.length; i++) {
      for (const k of keysA) {
        if (cleanA[i][k] !== cleanB[i][k]) return false;
      }
    }
    return true;
  }
}

// Generate DDL/Inserts and execute SQL query in isolated AlaSQL sandbox
function executeInSandbox(database, sqlQuery) {
  const dbId = 'gradetest_db_' + Math.random().toString(36).substring(2, 9);
  
  try {
    validateSqlQuery(sqlQuery);
  } catch (err) {
    return { success: false, error: err.message };
  }

  // Create database
  alasql(`CREATE DATABASE IF NOT EXISTS ${dbId}; USE ${dbId};`);
  
  try {
    // Populate schema and rows
    for (const table of database.tables) {
      const colDefs = table.columns.map(c => `[${c.name}] ${c.type}`).join(', ');
      alasql(`CREATE TABLE IF NOT EXISTS [${table.name}] (${colDefs});`);
      
      if (table.rows && table.rows.length > 0) {
        alasql(`INSERT INTO [${table.name}] SELECT * FROM ?`, [table.rows]);
      }
    }

    // Execute query
    const result = alasql(sqlQuery);
    
    // Clean up
    alasql(`DROP DATABASE ${dbId}`);
    return { success: true, data: result };
  } catch (err) {
    try {
      alasql(`DROP DATABASE ${dbId}`);
    } catch(e) {}
    return { success: false, error: err.message };
  }
}

// ==========================================
// 1. SQL Practice Databases
// ==========================================

exports.createDatabase = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ user_id: req.user.id });
    if (!teacher) {
      return res.status(403).json({ message: 'Teacher profile not found.' });
    }

    const { name, description, tables } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Database name is required.' });
    }

    const nextId = await getNextSequenceValue('sql_databases');
    const db = await SqlDatabase.create({
      _id: nextId,
      teacher_id: teacher._id,
      name,
      description: description || '',
      tables: tables || []
    });

    res.status(201).json({ message: 'SQL Database created successfully.', database: db });
  } catch (err) {
    next(err);
  }
};

exports.getDatabases = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ user_id: req.user.id });
    if (!teacher) {
      return res.status(403).json({ message: 'Access denied: not a teacher.' });
    }

    const databases = await SqlDatabase.find({ teacher_id: teacher._id }).sort({ created_at: -1 }).lean();
    res.status(200).json(databases);
  } catch (err) {
    next(err);
  }
};

exports.getDatabaseDetails = async (req, res, next) => {
  try {
    const db = await SqlDatabase.findById(req.params.id).lean();
    if (!db) {
      return res.status(404).json({ message: 'SQL Database not found.' });
    }
    res.status(200).json(db);
  } catch (err) {
    next(err);
  }
};

exports.updateDatabase = async (req, res, next) => {
  try {
    const { name, description, tables } = req.body;
    const db = await SqlDatabase.findById(req.params.id);
    if (!db) {
      return res.status(404).json({ message: 'SQL Database not found.' });
    }

    db.name = name || db.name;
    db.description = description !== undefined ? description : db.description;
    db.tables = tables || db.tables;
    db.updated_at = Date.now();

    await db.save();
    res.status(200).json({ message: 'SQL Database updated successfully.', database: db });
  } catch (err) {
    next(err);
  }
};

exports.deleteDatabase = async (req, res, next) => {
  try {
    const activeAssignment = await SqlAssignment.findOne({ sql_database_id: req.params.id });
    if (activeAssignment) {
      return res.status(400).json({ message: 'Cannot delete database. It is currently being used by SQL Assignment: ' + activeAssignment.title });
    }

    await SqlDatabase.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'SQL Database deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 2. SQL Assignments
// ==========================================

exports.createAssignment = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ user_id: req.user.id });
    if (!teacher) {
      return res.status(403).json({ message: 'Teacher profile not found.' });
    }

    const { title, description, sqlDatabaseId, questions, assignedClass, startTime, endTime, maxAttempts, allowedRollNumbers } = req.body;
    if (!title || !sqlDatabaseId || !questions || questions.length === 0) {
      return res.status(400).json({ message: 'Title, Database Schema, and at least one Question are required.' });
    }

    const nextId = await getNextSequenceValue('sql_assignments');
    const assignment = await SqlAssignment.create({
      _id: nextId,
      teacher_id: teacher._id,
      sql_database_id: sqlDatabaseId,
      title,
      description: description || '',
      questions,
      assigned_class: assignedClass || 'All',
      allowed_roll_numbers: allowedRollNumbers || [],
      start_time: startTime ? new Date(startTime) : null,
      end_time: endTime ? new Date(endTime) : null,
      max_attempts: maxAttempts || 1
    });

    res.status(201).json({ message: 'SQL Assignment created successfully.', assignment });
  } catch (err) {
    next(err);
  }
};

exports.getAssignments = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ user_id: req.user.id });
    if (!teacher) {
      return res.status(403).json({ message: 'Access denied: not a teacher.' });
    }

    const assignments = await SqlAssignment.find({ teacher_id: teacher._id }).sort({ created_at: -1 }).lean();
    
    // Enrich with Database Name
    const dbIds = assignments.map(a => a.sql_database_id);
    const databases = await SqlDatabase.find({ _id: { $in: dbIds } }).select('name').lean();
    const dbMap = new Map(databases.map(d => [d._id, d.name]));

    const enriched = assignments.map(a => ({
      ...a,
      database_name: dbMap.get(a.sql_database_id) || 'Unknown'
    }));

    res.status(200).json(enriched);
  } catch (err) {
    next(err);
  }
};

exports.getAssignmentDetails = async (req, res, next) => {
  try {
    const assignment = await SqlAssignment.findById(req.params.id).lean();
    if (!assignment) {
      return res.status(404).json({ message: 'SQL Assignment not found.' });
    }

    const database = await SqlDatabase.findById(assignment.sql_database_id).lean();
    res.status(200).json({ assignment, database });
  } catch (err) {
    next(err);
  }
};

exports.updateAssignment = async (req, res, next) => {
  try {
    const { title, description, sqlDatabaseId, questions, assignedClass, startTime, endTime, maxAttempts, allowedRollNumbers } = req.body;
    const assignment = await SqlAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'SQL Assignment not found.' });
    }

    assignment.title = title || assignment.title;
    assignment.description = description !== undefined ? description : assignment.description;
    assignment.sql_database_id = sqlDatabaseId || assignment.sql_database_id;
    assignment.questions = questions || assignment.questions;
    assignment.assigned_class = assignedClass || assignment.assigned_class;
    assignment.allowed_roll_numbers = allowedRollNumbers !== undefined ? allowedRollNumbers : assignment.allowed_roll_numbers;
    assignment.start_time = startTime ? new Date(startTime) : assignment.start_time;
    assignment.end_time = endTime ? new Date(endTime) : assignment.end_time;
    assignment.max_attempts = maxAttempts !== undefined ? maxAttempts : assignment.max_attempts;
    assignment.updated_at = Date.now();

    await assignment.save();
    res.status(200).json({ message: 'SQL Assignment updated successfully.', assignment });
  } catch (err) {
    next(err);
  }
};

exports.deleteAssignment = async (req, res, next) => {
  try {
    const submissionsCount = await SqlSubmission.countDocuments({ sql_assignment_id: req.params.id, status: { $ne: 'Draft' } });
    if (submissionsCount > 0) {
      return res.status(400).json({ message: 'Cannot delete assignment. It already has student submissions.' });
    }

    await SqlAssignment.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'SQL Assignment deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 3. Student Features
// ==========================================

exports.getStudentAssignments = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user_id: req.user.id });
    if (!student) {
      return res.status(403).json({ message: 'Student profile not found.' });
    }

    // Find assignments that are active or scheduled
    const allAssignments = await SqlAssignment.find({
      $or: [
        { assigned_class: 'All' },
        { assigned_class: student.class_section }
      ]
    }).sort({ created_at: -1 }).lean();

    // Filter by allowed roll numbers
    const assignments = allAssignments.filter(a => {
      if (a.allowed_roll_numbers && a.allowed_roll_numbers.length > 0) {
        return a.allowed_roll_numbers.includes(student.roll_number);
      }
      return true;
    });

    // Enrich with database info & submission tracking
    const dbIds = assignments.map(a => a.sql_database_id);
    const dbs = await SqlDatabase.find({ _id: { $in: dbIds } }).select('name').lean();
    const dbMap = new Map(dbs.map(d => [d._id, d.name]));

    const submissions = await SqlSubmission.find({ 
      student_id: student._id 
    }).lean();

    const enriched = assignments.map(a => {
      const studentSubs = submissions.filter(s => s.sql_assignment_id === a._id);
      const submittedAttempts = studentSubs.filter(s => s.status !== 'Draft');
      const activeDraft = studentSubs.find(s => s.status === 'Draft');

      return {
        ...a,
        database_name: dbMap.get(a.sql_database_id) || 'Unknown',
        total_attempts: submittedAttempts.length,
        has_draft: !!activeDraft,
        draft_submission_id: activeDraft ? activeDraft._id : null,
        submissions: studentSubs
      };
    });

    res.status(200).json(enriched);
  } catch (err) {
    next(err);
  }
};

exports.getStudentAssignmentDetails = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user_id: req.user.id });
    if (!student) {
      return res.status(403).json({ message: 'Student profile not found.' });
    }

    const assignment = await SqlAssignment.findById(req.params.id).lean();
    if (!assignment) {
      return res.status(404).json({ message: 'SQL Assignment not found.' });
    }

    if (assignment.allowed_roll_numbers && assignment.allowed_roll_numbers.length > 0) {
      if (!assignment.allowed_roll_numbers.includes(student.roll_number)) {
        return res.status(403).json({ message: 'Access denied: You are not assigned to this practice exercise.' });
      }
    }

    const database = await SqlDatabase.findById(assignment.sql_database_id).lean();

    // Check attempt counts
    const submittedAttempts = await SqlSubmission.countDocuments({
      sql_assignment_id: assignment._id,
      student_id: student._id,
      status: { $ne: 'Draft' }
    });

    let draft = await SqlSubmission.findOne({
      sql_assignment_id: assignment._id,
      student_id: student._id,
      status: 'Draft'
    });

    if (!draft && submittedAttempts < assignment.max_attempts) {
      // Auto create draft attempt
      const nextId = await getNextSequenceValue('sql_submissions');
      draft = await SqlSubmission.create({
        _id: nextId,
        sql_assignment_id: assignment._id,
        student_id: student._id,
        attempt_number: submittedAttempts + 1,
        status: 'Draft',
        answers: assignment.questions.map((q, idx) => ({
          question_idx: idx,
          submitted_query: '',
          is_correct: false,
          auto_marks: 0,
          manual_marks: null,
          feedback: ''
        }))
      });
    }

    res.status(200).json({
      assignment: {
        ...assignment,
        questions: assignment.questions.map(q => ({
          question_text: q.question_text,
          points: q.points,
          difficulty: q.difficulty,
          hints: q.hints
        })) // Hide expected_sql from students!
      },
      database,
      submission: draft || null,
      max_attempts_reached: submittedAttempts >= assignment.max_attempts
    });
  } catch (err) {
    next(err);
  }
};

exports.saveStudentDraft = async (req, res, next) => {
  try {
    const { submissionId, answers } = req.body;
    const submission = await SqlSubmission.findById(submissionId);
    if (!submission || submission.status !== 'Draft') {
      return res.status(404).json({ message: 'Active draft not found.' });
    }

    submission.answers = answers;
    submission.updated_at = Date.now();
    await submission.save();

    res.status(200).json({ message: 'SQL Assignment Draft saved successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.submitStudentAssignment = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user_id: req.user.id });
    if (!student) {
      return res.status(403).json({ message: 'Student profile not found.' });
    }

    const { submissionId, answers } = req.body;
    const submission = await SqlSubmission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission record not found.' });
    }

    const assignment = await SqlAssignment.findById(submission.sql_assignment_id);
    const database = await SqlDatabase.findById(assignment.sql_database_id);

    // Save final queries
    submission.answers = answers;

    // Automatic Grading! (Bypassed per request, all answers default to 0/pending manual grade)
    for (let i = 0; i < assignment.questions.length; i++) {
      const sa = submission.answers.find(ans => ans.question_idx === i);
      if (!sa) continue;
      sa.is_correct = false;
      sa.auto_marks = 0;
    }

    submission.status = 'Submitted';
    submission.submitted_at = Date.now();
    submission.updated_at = Date.now();

    await submission.save();
    res.status(200).json({ message: 'Assignment submitted and auto-graded successfully!', submission });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 4. Teacher Reviews & Grades
// ==========================================

exports.getSubmissionsForReview = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ user_id: req.user.id });
    if (!teacher) {
      return res.status(403).json({ message: 'Access denied: not a teacher.' });
    }

    // Get all assignments for this teacher
    const assignments = await SqlAssignment.find({ teacher_id: teacher._id }).lean();
    const assignmentIds = assignments.map(a => a._id);

    // Get all submissions for these assignments
    const submissions = await SqlSubmission.find({ sql_assignment_id: { $in: assignmentIds } }).sort({ submitted_at: -1 }).lean();

    // Get all student profiles
    const students = await Student.find().lean();

    const results = [];

    // Group submissions by assignment
    for (const assign of assignments) {
      const assignmentSubmissions = submissions.filter(s => s.sql_assignment_id === assign._id);
      const totalPoints = assign.questions.reduce((sum, q) => sum + q.points, 0);

      // Determine assigned students for this assignment
      const assignedStudents = students.filter(student => {
        if (assign.assigned_class !== 'All' && assign.assigned_class !== student.class_section) {
          return false;
        }
        if (assign.allowed_roll_numbers && assign.allowed_roll_numbers.length > 0) {
          return assign.allowed_roll_numbers.includes(student.roll_number);
        }
        return true;
      });

      for (const student of assignedStudents) {
        const studentSubs = assignmentSubmissions.filter(s => s.student_id.toString() === student._id.toString());
        const completedSubs = studentSubs.filter(s => s.status !== 'Draft');

        if (completedSubs.length > 0) {
          // Add actual completed submissions
          for (const sub of completedSubs) {
            const autoPoints = sub.answers.reduce((sum, a) => sum + a.auto_marks, 0);
            const finalPoints = sub.answers.reduce((sum, a) => sum + (a.manual_marks !== null && a.manual_marks !== undefined ? a.manual_marks : a.auto_marks), 0);

            results.push({
              ...sub,
              assignment_title: assign.title,
              student_name: student.full_name,
              student_roll: student.roll_number,
              total_possible_marks: totalPoints,
              auto_graded_marks: autoPoints,
              final_marks: finalPoints
            });
          }
        } else {
          // No completed submission -> status: "Not Submitted"
          results.push({
            _id: `virtual_${assign._id}_${student._id}`,
            sql_assignment_id: assign._id,
            student_id: student._id,
            attempt_number: 0,
            submitted_at: null,
            status: 'Not Submitted',
            answers: [],
            assignment_title: assign.title,
            student_name: student.full_name,
            student_roll: student.roll_number,
            total_possible_marks: totalPoints,
            auto_graded_marks: 0,
            final_marks: 0
          });
        }
      }
    }

    res.status(200).json(results);
  } catch (err) {
    next(err);
  }
};

exports.getSubmissionDetailForReview = async (req, res, next) => {
  try {
    const submissionId = req.params.id;
    const submission = await SqlSubmission.findById(submissionId).lean();
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    const assignment = await SqlAssignment.findById(submission.sql_assignment_id).lean();
    if (!assignment) {
      return res.status(404).json({ message: 'SQL Assignment not found.' });
    }

    if (req.user.role === 'Student') {
      const student = await Student.findOne({ user_id: req.user.id });
      if (!student || submission.student_id.toString() !== student._id.toString()) {
        return res.status(403).json({ message: 'Access denied: You can only view your own submission.' });
      }
    }

    const database = await SqlDatabase.findById(assignment.sql_database_id).lean();
    const student = await Student.findById(submission.student_id).lean();

    res.status(200).json({
      submission,
      assignment,
      database,
      student: student ? { full_name: student.full_name, roll_number: student.roll_number } : null
    });
  } catch (err) {
    next(err);
  }
};

exports.gradeSubmissionManually = async (req, res, next) => {
  try {
    const { answers } = req.body; // array of: { question_idx, manual_marks, feedback }
    const submission = await SqlSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    for (const update of answers) {
      const sa = submission.answers.find(ans => ans.question_idx === update.question_idx);
      if (sa) {
        if (update.manual_marks !== undefined) sa.manual_marks = update.manual_marks;
        if (update.feedback !== undefined) sa.feedback = update.feedback;
      }
    }

    submission.status = 'Graded';
    submission.updated_at = Date.now();
    await submission.save();

    res.status(200).json({ message: 'Submission graded and reviewed successfully.', submission });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 5. Student Submission History
// ==========================================

exports.getStudentSubmissionHistory = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user_id: req.user.id });
    if (!student) {
      return res.status(403).json({ message: 'Student profile not found.' });
    }

    // Find all assignments assigned to the student
    const allAssignments = await SqlAssignment.find({
      $or: [
        { assigned_class: 'All' },
        { assigned_class: student.class_section }
      ]
    }).lean();

    const assignedAssignments = allAssignments.filter(a => {
      if (a.allowed_roll_numbers && a.allowed_roll_numbers.length > 0) {
        return a.allowed_roll_numbers.includes(student.roll_number);
      }
      return true;
    });

    const submissions = await SqlSubmission.find({ student_id: student._id }).sort({ submitted_at: -1 }).lean();

    const completedAssignIds = new Set(
      submissions.filter(s => s.status !== 'Draft').map(s => s.sql_assignment_id.toString())
    );

    const results = [];

    // Add actual completed submissions
    submissions.filter(s => s.status !== 'Draft').forEach(s => {
      const assign = assignedAssignments.find(a => a._id.toString() === s.sql_assignment_id.toString());
      const autoPoints = s.answers.reduce((sum, a) => sum + a.auto_marks, 0);
      const finalPoints = s.answers.reduce((sum, a) => sum + (a.manual_marks !== null && a.manual_marks !== undefined ? a.manual_marks : a.auto_marks), 0);

      results.push({
        ...s,
        assignment_title: assign ? assign.title : 'Unknown Assignment',
        auto_graded_marks: autoPoints,
        final_marks: finalPoints
      });
    });

    // Add virtual "Not Submitted" for assignments that are assigned but not completed
    assignedAssignments.forEach(a => {
      if (!completedAssignIds.has(a._id.toString())) {
        results.push({
          _id: `temp-${a._id}`,
          sql_assignment_id: a._id,
          student_id: student._id,
          attempt_number: 0,
          submitted_at: null,
          status: 'Not Submitted',
          answers: [],
          auto_graded_marks: 0,
          final_marks: 0,
          assignment_title: a.title
        });
      }
    });

    res.status(200).json(results);
  } catch (err) {
    next(err);
  }
};
