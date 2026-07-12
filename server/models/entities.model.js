const { poolPromise, mssql } = require('../config/db');

class Student {
  static async create({ userId, fullName, rollNumber, classSection }) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('userId', mssql.Int, userId)
      .input('fullName', mssql.NVarChar, fullName)
      .input('rollNumber', mssql.NVarChar, rollNumber)
      .input('classSection', mssql.NVarChar, classSection)
      .query(`
        INSERT INTO students (user_id, full_name, roll_number, class_section) 
        OUTPUT INSERTED.id
        VALUES (@userId, @fullName, @rollNumber, @classSection)
      `);
    return result.recordset[0].id;
  }

  static async findByUserId(userId) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('userId', mssql.Int, userId)
      .query('SELECT * FROM students WHERE user_id = @userId');
    return result.recordset[0];
  }
}

class Teacher {
  static async create({ userId, fullName, department }) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('userId', mssql.Int, userId)
      .input('fullName', mssql.NVarChar, fullName)
      .input('department', mssql.NVarChar, department)
      .query(`
        INSERT INTO teachers (user_id, full_name, department) 
        OUTPUT INSERTED.id
        VALUES (@userId, @fullName, @department)
      `);
    return result.recordset[0].id;
  }

  static async findByUserId(userId) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('userId', mssql.Int, userId)
      .query('SELECT * FROM teachers WHERE user_id = @userId');
    return result.recordset[0];
  }
}

class Subject {
  static async getAll() {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request().query('SELECT * FROM subjects ORDER BY name ASC');
    return result.recordset;
  }

  static async create({ name, description }) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('name', mssql.NVarChar, name)
      .input('description', mssql.NVarChar, description)
      .query('INSERT INTO subjects (name, description) OUTPUT INSERTED.id VALUES (@name, @description)');
    return result.recordset[0].id;
  }
}

class Category {
  static async getAll() {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request().query('SELECT * FROM categories ORDER BY name ASC');
    return result.recordset;
  }

  static async create({ name, description }) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('name', mssql.NVarChar, name)
      .input('description', mssql.NVarChar, description)
      .query('INSERT INTO categories (name, description) OUTPUT INSERTED.id VALUES (@name, @description)');
    return result.recordset[0].id;
  }
}

class QuestionBank {
  static async getAll() {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request().query('SELECT * FROM question_banks ORDER BY name ASC');
    return result.recordset;
  }

  static async create({ name, description }) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('name', mssql.NVarChar, name)
      .input('description', mssql.NVarChar, description)
      .query('INSERT INTO question_banks (name, description) OUTPUT INSERTED.id VALUES (@name, @description)');
    return result.recordset[0].id;
  }
}

module.exports = { Student, Teacher, Subject, Category, QuestionBank };
