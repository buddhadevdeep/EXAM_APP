const { poolPromise, mssql } = require('../config/db');

class Question {
  static async getAll() {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request().query(`
      SELECT q.*, qb.name as question_bank_name, c.name as category_name, s.name as subject_name 
      FROM questions q
      JOIN question_banks qb ON q.question_bank_id = qb.id
      JOIN categories c ON q.category_id = c.id
      JOIN subjects s ON q.subject_id = s.id
    `);
    return result.recordset;
  }

  static async create({ questionBankId, categoryId, subjectId, title, description, points, sqlTemplate }) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('questionBankId', mssql.Int, questionBankId)
      .input('categoryId', mssql.Int, categoryId)
      .input('subjectId', mssql.Int, subjectId)
      .input('title', mssql.NVarChar, title)
      .input('description', mssql.NVarChar, description)
      .input('points', mssql.Int, points)
      .input('sqlTemplate', mssql.NVarChar, sqlTemplate)
      .query(`
        INSERT INTO questions (question_bank_id, category_id, subject_id, title, description, points, sql_template) 
        OUTPUT INSERTED.id
        VALUES (@questionBankId, @categoryId, @subjectId, @title, @description, @points, @sqlTemplate)
      `);
    return result.recordset[0].id;
  }
}

class Exam {
  static async create({ teacherId, subjectId, title, description, totalMarks, durationMinutes, accessCode = null, startTime = null, endTime = null }) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('teacherId', mssql.Int, teacherId)
      .input('subjectId', mssql.Int, subjectId)
      .input('title', mssql.NVarChar, title)
      .input('description', mssql.NVarChar, description)
      .input('totalMarks', mssql.Int, totalMarks)
      .input('durationMinutes', mssql.Int, durationMinutes)
      .input('accessCode', mssql.NVarChar, accessCode)
      .input('startTime', mssql.DateTime, startTime)
      .input('endTime', mssql.DateTime, endTime)
      .query(`
        INSERT INTO exams (teacher_id, subject_id, title, description, total_marks, duration_minutes, access_code, start_time, end_time) 
        OUTPUT INSERTED.id
        VALUES (@teacherId, @subjectId, @title, @description, @totalMarks, @durationMinutes, @accessCode, @startTime, @endTime)
      `);
    return result.recordset[0].id;
  }

  static async addQuestions(examId, questionIds) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    // Insert individually or in block
    for (const [idx, qId] of questionIds.entries()) {
      await pool.request()
        .input('examId', mssql.Int, examId)
        .input('questionId', mssql.Int, qId)
        .input('orderIndex', mssql.Int, idx)
        .query('INSERT INTO exam_questions (exam_id, question_id, order_index) VALUES (@examId, @questionId, @orderIndex)');
    }
  }

  static async getExamQuestions(examId) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('examId', mssql.Int, examId)
      .query(`
        SELECT q.*, eq.order_index 
        FROM exam_questions eq
        JOIN questions q ON eq.question_id = q.id
        WHERE eq.exam_id = @examId
        ORDER BY eq.order_index ASC
      `);
    return result.recordset;
  }

  static async getAll() {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request().query(`
      SELECT e.*, t.full_name as teacher_name, s.name as subject_name 
      FROM exams e
      JOIN teachers t ON e.teacher_id = t.id
      JOIN subjects s ON e.subject_id = s.id
      ORDER BY e.created_at DESC
    `);
    return result.recordset;
  }

  static async getById(id) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('id', mssql.Int, id)
      .query(`
        SELECT e.*, t.full_name as teacher_name, s.name as subject_name 
        FROM exams e
        JOIN teachers t ON e.teacher_id = t.id
        JOIN subjects s ON e.subject_id = s.id
        WHERE e.id = @id
      `);
    return result.recordset[0];
  }

  static async update(id, updates) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const keys = Object.keys(updates);
    if (keys.length === 0) return;

    const request = pool.request();
    request.input('id', mssql.Int, id);

    const setClause = keys.map((k, idx) => {
      let val = updates[k];
      if (k === 'start_time' || k === 'end_time') {
        request.input(`val_${idx}`, mssql.DateTime, val ? new Date(val) : null);
      } else if (k === 'subject_id' || k === 'total_marks' || k === 'duration_minutes' || k === 'is_published' || k === 'is_closed') {
        request.input(`val_${idx}`, mssql.Int, val !== null ? parseInt(val) : null);
      } else {
        request.input(`val_${idx}`, mssql.NVarChar, val);
      }
      return `[${k}] = @val_${idx}`;
    }).join(', ');

    await request.query(`UPDATE exams SET ${setClause} WHERE id = @id`);
  }
}

class Submission {
  static async createDraftOrGet(studentId, examId) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    
    // Check if exists
    const existing = await pool.request()
      .input('studentId', mssql.Int, studentId)
      .input('examId', mssql.Int, examId)
      .query('SELECT * FROM submissions WHERE student_id = @studentId AND exam_id = @examId');

    if (existing.recordset.length > 0) {
      return existing.recordset[0];
    }

    const result = await pool.request()
      .input('studentId', mssql.Int, studentId)
      .input('examId', mssql.Int, examId)
      .query(`
        INSERT INTO submissions (student_id, exam_id, status) 
        OUTPUT INSERTED.id, INSERTED.student_id, INSERTED.exam_id, INSERTED.status
        VALUES (@studentId, @examId, 'Draft')
      `);
    return result.recordset[0];
  }

  static async saveAnswer(submissionId, questionId, sqlQuery) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    
    // Check if answers already exists
    const check = await pool.request()
      .input('submissionId', mssql.Int, submissionId)
      .input('questionId', mssql.Int, questionId)
      .query('SELECT 1 FROM submission_answers WHERE submission_id = @submissionId AND question_id = @questionId');

    if (check.recordset.length > 0) {
      await pool.request()
        .input('submissionId', mssql.Int, submissionId)
        .input('questionId', mssql.Int, questionId)
        .input('sqlQuery', mssql.NVarChar, sqlQuery)
        .query(`
          UPDATE submission_answers 
          SET sql_query = @sqlQuery, submitted_at = GETDATE()
          WHERE submission_id = @submissionId AND question_id = @questionId
        `);
    } else {
      await pool.request()
        .input('submissionId', mssql.Int, submissionId)
        .input('questionId', mssql.Int, questionId)
        .input('sqlQuery', mssql.NVarChar, sqlQuery)
        .query(`
          INSERT INTO submission_answers (submission_id, question_id, sql_query) 
          VALUES (@submissionId, @questionId, @sqlQuery)
        `);
    }
  }

  static async getAnswers(submissionId) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('submissionId', mssql.Int, submissionId)
      .query('SELECT * FROM submission_answers WHERE submission_id = @submissionId');
    return result.recordset;
  }

  static async submitExam(submissionId) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    await pool.request()
      .input('submissionId', mssql.Int, submissionId)
      .query("UPDATE submissions SET status = 'Submitted', submitted_at = GETDATE() WHERE id = @submissionId");
  }

  static async getSubmissionsForExam(examId) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('examId', mssql.Int, examId)
      .query(`
        SELECT sub.*, s.full_name as student_name, s.roll_number, s.class_section
        FROM submissions sub
        JOIN students s ON sub.student_id = s.id
        WHERE sub.exam_id = @examId
      `);
    return result.recordset;
  }

  static async getSubmissionsForStudent(studentId) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('studentId', mssql.Int, studentId)
      .query(`
        SELECT sub.*, e.title as exam_title, e.total_marks, e.duration_minutes, s.name as subject_name,
               (SELECT SUM(marks_obtained) FROM marks WHERE submission_id = sub.id) as marks_obtained,
               (SELECT comments FROM feedback WHERE submission_id = sub.id) as teacher_comments
        FROM submissions sub
        JOIN exams e ON sub.exam_id = e.id
        JOIN subjects s ON e.subject_id = s.id
        WHERE sub.student_id = @studentId AND e.is_closed = 0
      `);
    return result.recordset;
  }

  static async getSubmissionDetails(submissionId) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('submissionId', mssql.Int, submissionId)
      .query(`
        SELECT sub.*, s.full_name as student_name, s.roll_number, s.class_section, e.title as exam_title, e.total_marks
        FROM submissions sub
        JOIN students s ON sub.student_id = s.id
        JOIN exams e ON sub.exam_id = e.id
        WHERE sub.id = @submissionId
      `);
    return result.recordset[0];
  }
}

class Grade {
  static async saveMarkAndFeedback(submissionId, questionId, teacherId, marksObtained, feedbackText) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');

    const check = await pool.request()
      .input('submissionId', mssql.Int, submissionId)
      .input('questionId', mssql.Int, questionId)
      .query('SELECT 1 FROM marks WHERE submission_id = @submissionId AND question_id = @questionId');

    if (check.recordset.length > 0) {
      await pool.request()
        .input('submissionId', mssql.Int, submissionId)
        .input('questionId', mssql.Int, questionId)
        .input('marksObtained', mssql.Decimal(5, 2), marksObtained)
        .input('feedback', mssql.NVarChar, feedbackText)
        .query(`
          UPDATE marks 
          SET marks_obtained = @marksObtained, feedback = @feedback, graded_at = GETDATE()
          WHERE submission_id = @submissionId AND question_id = @questionId
        `);
    } else {
      await pool.request()
        .input('submissionId', mssql.Int, submissionId)
        .input('questionId', mssql.Int, questionId)
        .input('teacherId', mssql.Int, teacherId)
        .input('marksObtained', mssql.Decimal(5, 2), marksObtained)
        .input('feedback', mssql.NVarChar, feedbackText)
        .query(`
          INSERT INTO marks (submission_id, question_id, teacher_id, marks_obtained, feedback) 
          VALUES (@submissionId, @questionId, @teacherId, @marksObtained, @feedback)
        `);
    }
  }

  static async getGrades(submissionId) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('submissionId', mssql.Int, submissionId)
      .query('SELECT * FROM marks WHERE submission_id = @submissionId');
    return result.recordset;
  }

  static async saveOverallFeedback(submissionId, teacherId, comments) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');

    const check = await pool.request()
      .input('submissionId', mssql.Int, submissionId)
      .query('SELECT 1 FROM feedback WHERE submission_id = @submissionId');

    if (check.recordset.length > 0) {
      await pool.request()
        .input('submissionId', mssql.Int, submissionId)
        .input('comments', mssql.NVarChar, comments)
        .query('UPDATE feedback SET comments = @comments, created_at = GETDATE() WHERE submission_id = @submissionId');
    } else {
      await pool.request()
        .input('submissionId', mssql.Int, submissionId)
        .input('teacherId', mssql.Int, teacherId)
        .input('comments', mssql.NVarChar, comments)
        .query('INSERT INTO feedback (submission_id, teacher_id, comments) VALUES (@submissionId, @teacherId, @comments)');
    }

    // Update submission status to Graded
    await pool.request()
      .input('submissionId', mssql.Int, submissionId)
      .query("UPDATE submissions SET status = 'Graded' WHERE id = @submissionId");
  }

  static async getOverallFeedback(submissionId) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('submissionId', mssql.Int, submissionId)
      .query('SELECT * FROM feedback WHERE submission_id = @submissionId');
    return result.recordset[0];
  }
}

module.exports = { Question, Exam, Submission, Grade };
