const { poolPromise, mssql } = require('../config/db');

class User {
  static async findById(id) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('id', mssql.Int, id)
      .query(`
        SELECT u.*, r.name as role_name 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.id = @id
      `);
    return result.recordset[0];
  }

  static async findByEmail(email) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('email', mssql.NVarChar, email)
      .query(`
        SELECT u.*, r.name as role_name 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.email = @email
      `);
    return result.recordset[0];
  }

  static async create({ email, passwordHash, roleId, isActive = 1, emailVerified = 0, token = null }) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request()
      .input('email', mssql.NVarChar, email)
      .input('passwordHash', mssql.NVarChar, passwordHash)
      .input('roleId', mssql.Int, roleId)
      .input('isActive', mssql.TinyInt, isActive)
      .input('emailVerified', mssql.TinyInt, emailVerified)
      .input('token', mssql.NVarChar, token)
      .query(`
        INSERT INTO users (email, password_hash, role_id, is_active, email_verified, verification_token) 
        OUTPUT INSERTED.id
        VALUES (@email, @passwordHash, @roleId, @isActive, @emailVerified, @token)
      `);
    return result.recordset[0].id;
  }

  static async update(id, updates) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const keys = Object.keys(updates);
    if (keys.length === 0) return;
    
    const request = pool.request();
    request.input('id', mssql.Int, id);
    
    const setClause = keys.map((k, idx) => {
      request.input(`val_${idx}`, updates[k]);
      return `[${k}] = @val_${idx}`;
    }).join(', ');

    await request.query(`UPDATE users SET ${setClause} WHERE id = @id`);
  }

  static async getAll() {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request().query(`
      SELECT u.id, u.email, u.role_id, r.name as role_name, u.is_active, u.email_verified, u.created_at,
             COALESCE(s.full_name, t.full_name, 'Admin') as full_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN teachers t ON u.id = t.user_id
      ORDER BY u.created_at DESC
    `);
    return result.recordset;
  }

  static async getTeachers() {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request().query(`
      SELECT u.id as user_id, t.id as teacher_id, t.full_name, t.department, u.email, u.is_active 
      FROM teachers t
      JOIN users u ON t.user_id = u.id
    `);
    return result.recordset;
  }

  static async getStudents() {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    const result = await pool.request().query(`
      SELECT u.id as user_id, s.id as student_id, s.full_name, s.roll_number, s.class_section, u.email, u.is_active 
      FROM students s
      JOIN users u ON s.user_id = u.id
    `);
    return result.recordset;
  }

  static async delete(id) {
    const pool = await poolPromise;
    await pool.request().query('USE smart_sql_exam;');
    
    // Delete submissions for this student first (cascades answers, marks, feedback)
    await pool.request()
      .input('userId', mssql.Int, id)
      .query(`
        DELETE FROM submissions 
        WHERE student_id = (SELECT id FROM students WHERE user_id = @userId)
      `);

    await pool.request()
      .input('id', mssql.Int, id)
      .query('DELETE FROM users WHERE id = @id');
  }
}

module.exports = User;
