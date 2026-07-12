const mssql = require('mssql/msnodesqlv8');
const config = require('./config');

const dbConfig = {
  connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=DESKTOP-IHUGRVP\\SQLEXPRESS;Database=smart_sql_exam;Trusted_Connection=Yes;TrustServerCertificate=Yes;',
  options: {
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

// Using ODBC Connection String for Local Named Instance with Windows Authentication

const poolPromise = new mssql.ConnectionPool(dbConfig)
  .connect()
  .then(async (pool) => {
    console.log('Connected to MS SQL Server successfully (smart_sql_exam).');
    await initializeDatabase(pool);
    return pool;
  })
  .catch((err) => {
    console.error('Database Connection Failed! Bad Config: ', err.message);
    throw err;
  });

async function initializeDatabase(pool) {
  console.log('Initializing database tables if not exist (Code-First approach)...');
  try {
    // 1. Roles table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='roles' AND xtype='U')
      CREATE TABLE roles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(50) NOT NULL UNIQUE,
        created_at DATETIME DEFAULT GETDATE()
      )
    `);

    // 2. Users table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
      CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        email NVARCHAR(255) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        role_id INT NOT NULL FOREIGN KEY REFERENCES roles(id),
        is_active TINYINT DEFAULT 1,
        email_verified TINYINT DEFAULT 0,
        verification_token NVARCHAR(255) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
      )
    `);

    // 3. Students table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='students' AND xtype='U')
      CREATE TABLE students (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL UNIQUE FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
        full_name NVARCHAR(255) NOT NULL,
        roll_number NVARCHAR(50) NOT NULL UNIQUE,
        class_section NVARCHAR(50) NOT NULL,
        created_at DATETIME DEFAULT GETDATE()
      )
    `);

    // 4. Teachers table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='teachers' AND xtype='U')
      CREATE TABLE teachers (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL UNIQUE FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
        full_name NVARCHAR(255) NOT NULL,
        department NVARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT GETDATE()
      )
    `);

    // 5. Subjects table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='subjects' AND xtype='U')
      CREATE TABLE subjects (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL UNIQUE,
        description NVARCHAR(MAX),
        created_at DATETIME DEFAULT GETDATE()
      )
    `);

    // 6. Categories table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='categories' AND xtype='U')
      CREATE TABLE categories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL UNIQUE,
        description NVARCHAR(MAX),
        created_at DATETIME DEFAULT GETDATE()
      )
    `);

    // 7. Question Banks table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='question_banks' AND xtype='U')
      CREATE TABLE question_banks (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL UNIQUE,
        description NVARCHAR(MAX),
        created_at DATETIME DEFAULT GETDATE()
      )
    `);

    // 8. Questions table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='questions' AND xtype='U')
      CREATE TABLE questions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        question_bank_id INT NOT NULL FOREIGN KEY REFERENCES question_banks(id) ON DELETE CASCADE,
        category_id INT NOT NULL FOREIGN KEY REFERENCES categories(id) ON DELETE CASCADE,
        subject_id INT NOT NULL FOREIGN KEY REFERENCES subjects(id),
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NOT NULL,
        points INT NOT NULL DEFAULT 10,
        sql_template NVARCHAR(MAX),
        created_at DATETIME DEFAULT GETDATE()
      )
    `);

    // 9. Exams table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='exams' AND xtype='U')
      CREATE TABLE exams (
        id INT IDENTITY(1,1) PRIMARY KEY,
        teacher_id INT NOT NULL FOREIGN KEY REFERENCES teachers(id),
        subject_id INT NOT NULL FOREIGN KEY REFERENCES subjects(id),
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        total_marks INT NOT NULL DEFAULT 100,
        duration_minutes INT NOT NULL DEFAULT 60,
        is_published TINYINT DEFAULT 0,
        is_closed TINYINT DEFAULT 0,
        access_code NVARCHAR(50) NULL,
        start_time DATETIME NULL,
        end_time DATETIME NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
      )
    `);

    // 10. Exam Questions table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='exam_questions' AND xtype='U')
      CREATE TABLE exam_questions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        exam_id INT NOT NULL FOREIGN KEY REFERENCES exams(id) ON DELETE CASCADE,
        question_id INT NOT NULL FOREIGN KEY REFERENCES questions(id),
        order_index INT NOT NULL DEFAULT 0,
        CONSTRAINT exam_question_unique UNIQUE (exam_id, question_id)
      )
    `);

    // 11. Submissions table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='submissions' AND xtype='U')
      CREATE TABLE submissions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        student_id INT NOT NULL FOREIGN KEY REFERENCES students(id),
        exam_id INT NOT NULL FOREIGN KEY REFERENCES exams(id),
        status NVARCHAR(50) NOT NULL DEFAULT 'Draft',
        submitted_at DATETIME NULL,
        created_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT student_exam_unique UNIQUE (student_id, exam_id)
      )
    `);

    // 12. Submission Answers table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='submission_answers' AND xtype='U')
      CREATE TABLE submission_answers (
        id INT IDENTITY(1,1) PRIMARY KEY,
        submission_id INT NOT NULL FOREIGN KEY REFERENCES submissions(id) ON DELETE CASCADE,
        question_id INT NOT NULL FOREIGN KEY REFERENCES questions(id),
        sql_query NVARCHAR(MAX) NOT NULL,
        submitted_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT submission_question_unique UNIQUE (submission_id, question_id)
      )
    `);

    // 13. Marks table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='marks' AND xtype='U')
      CREATE TABLE marks (
        id INT IDENTITY(1,1) PRIMARY KEY,
        submission_id INT NOT NULL FOREIGN KEY REFERENCES submissions(id) ON DELETE CASCADE,
        question_id INT NOT NULL FOREIGN KEY REFERENCES questions(id),
        teacher_id INT NOT NULL FOREIGN KEY REFERENCES teachers(id),
        marks_obtained DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        feedback NVARCHAR(MAX),
        graded_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT submission_question_grader_unique UNIQUE (submission_id, question_id)
      )
    `);

    // 14. Feedback table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='feedback' AND xtype='U')
      CREATE TABLE feedback (
        id INT IDENTITY(1,1) PRIMARY KEY,
        submission_id INT NOT NULL UNIQUE FOREIGN KEY REFERENCES submissions(id) ON DELETE CASCADE,
        teacher_id INT NOT NULL FOREIGN KEY REFERENCES teachers(id),
        comments NVARCHAR(MAX),
        created_at DATETIME DEFAULT GETDATE()
      )
    `);

    // 15. Notifications table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='notifications' AND xtype='U')
      CREATE TABLE notifications (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE,
        title NVARCHAR(255) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        is_read TINYINT DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE()
      )
    `);

    // 16. Activity Logs table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='activity_logs' AND xtype='U')
      CREATE TABLE activity_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NULL FOREIGN KEY REFERENCES users(id) ON DELETE SET NULL,
        action NVARCHAR(255) NOT NULL,
        details NVARCHAR(MAX),
        ip_address NVARCHAR(45) NULL,
        created_at DATETIME DEFAULT GETDATE()
      )
    `);

    // 17. Settings table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='settings' AND xtype='U')
      CREATE TABLE settings (
        id INT IDENTITY(1,1) PRIMARY KEY,
        setting_key NVARCHAR(100) NOT NULL UNIQUE,
        setting_value NVARCHAR(MAX),
        updated_at DATETIME DEFAULT GETDATE()
      )
    `);

    // Seed Initial roles & admin user if empty
    const checkRoles = await pool.request().query('SELECT COUNT(*) as count FROM roles');
    if (checkRoles.recordset[0].count === 0) {
      await pool.request().query(`
        INSERT INTO roles (name) VALUES ('Admin'), ('Teacher'), ('Student');
      `);
      // Seed default Admin password: 'password123'
      await pool.request().query(`
        INSERT INTO users (email, password_hash, role_id, is_active, email_verified) 
        VALUES ('admin@platform.com', '$2b$10$tMh4EeeZJgVfN8l.HExbQeS.jJ.tOa5zP48KkK4P263h/Y2B6hI.q', 1, 1, 1);
      `);
      console.log('Seeded Roles and default Admin successfully.');
    }

    // Guarantee specific Teacher deep@gmail.com (password: 123456)
    const rolesRes = await pool.request().query("SELECT id FROM roles WHERE name = 'Teacher'");
    if (rolesRes.recordset.length > 0) {
      const teacherRoleId = rolesRes.recordset[0].id;
      
      const userRes = await pool.request().query("SELECT id, role_id FROM users WHERE email = 'deep@gmail.com'");
      let userId;
      
      if (userRes.recordset.length > 0) {
        userId = userRes.recordset[0].id;
        // Force update role_id and password
        await pool.request().query(`
          UPDATE users 
          SET role_id = ${teacherRoleId}, 
              password_hash = '$2b$10$yHA.mA9lDqnvqIv2QTl7nOlhCQlux4svJO0kKodi.tuDbY2P60FKu',
              is_active = 1,
              email_verified = 1
          WHERE id = ${userId}
        `);
        // Delete from students if they were registered as student
        await pool.request().query(`DELETE FROM students WHERE user_id = ${userId}`);
      } else {
        // Create user from scratch
        const insertUser = await pool.request().query(`
          INSERT INTO users (email, password_hash, role_id, is_active, email_verified) 
          OUTPUT INSERTED.id
          VALUES ('deep@gmail.com', '$2b$10$yHA.mA9lDqnvqIv2QTl7nOlhCQlux4svJO0kKodi.tuDbY2P60FKu', ${teacherRoleId}, 1, 1);
        `);
        userId = insertUser.recordset[0].id;
      }
      
      // Ensure they exist in teachers table
      const teacherCheck = await pool.request().query(`SELECT * FROM teachers WHERE user_id = ${userId}`);
      if (teacherCheck.recordset.length === 0) {
        await pool.request().query(`
          INSERT INTO teachers (user_id, full_name, department) 
          VALUES (${userId}, 'Deep Patel', 'Computer Science');
        `);
      }
      console.log('Force verified deep@gmail.com is a Teacher user.');
    }


    // Seed default Subjects if empty
    const checkSubjects = await pool.request().query('SELECT COUNT(*) as count FROM subjects');
    if (checkSubjects.recordset[0].count === 0) {
      await pool.request().query(`
        INSERT INTO subjects (name, description) VALUES 
        ('Database Management Systems', 'Core database concepts, SQL queries, normalization, transactions.'),
        ('Advanced Database Systems', 'Advanced query tuning, distributed databases, NoSQL.');

        INSERT INTO categories (name, description) VALUES 
        ('Basic SELECT Queries', 'Simple select queries with WHERE, ORDER BY, and LIMIT constraints.'),
        ('SQL Aggregations', 'GROUP BY, HAVING, and aggregate functions like COUNT, SUM, AVG.'),
        ('SQL Joins', 'INNER JOIN, LEFT JOIN, RIGHT JOIN, and self joins.');

        INSERT INTO question_banks (name, description) VALUES 
        ('DBMS Semester 1 Question Bank', 'Collection of basic and intermediate SQL questions for first year undergraduates.');
      `);

      // Resolve seeded primary keys to insert default questions
      const ids = await pool.request().query(`
        SELECT TOP 1 (SELECT id FROM question_banks WHERE name = 'DBMS Semester 1 Question Bank') as qbId,
                     (SELECT id FROM categories WHERE name = 'Basic SELECT Queries') as catId,
                     (SELECT id FROM subjects WHERE name = 'Database Management Systems') as subId
      `);
      const { qbId, catId, subId } = ids.recordset[0];

      await pool.request().query(`
        INSERT INTO questions (question_bank_id, category_id, subject_id, title, description, points, sql_template) 
        VALUES (${qbId}, ${catId}, ${subId}, 'Select All Employees', 'Write a query to retrieve all columns from the employees table where department is "Engineering" and salary is greater than 70000.', 10, 'SELECT * FROM employees WHERE department = ''Engineering'' AND salary > 70000;');
      `);
      console.log('Seeded SQL subjects, categories, and question bank template.');
    }
  } catch (err) {
    console.error('Table Auto-Initialization Failed: ', err.message);
  }
}

module.exports = {
  mssql,
  poolPromise
};
