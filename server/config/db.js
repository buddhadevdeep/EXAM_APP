const mongoose = require('mongoose');
const config = require('./config');

const MONGODB_URI = config.MONGODB_URI;

mongoose.set('strictQuery', false);
mongoose.set('bufferCommands', false);

const dbPromise = mongoose.connect(MONGODB_URI).then(async (m) => {
  console.log('Connected to MongoDB Atlas successfully.');
  await initializeDatabase();
  return m;
}).catch(async (err) => {
  console.error('\n=========================================');
  console.error('DATABASE CONNECTION ERROR:');
  console.error(err.message);
  console.error('=========================================');
  console.error('GUIDE TO FIX THIS CONNECTION:');
  console.error('1. Whitelist your IP in MongoDB Atlas:');
  console.error('   Go to Network Access -> Add IP Address -> Add Current IP (or 0.0.0.0/0).');
  console.error('2. Or use a local MongoDB:');
  console.error('   Install local MongoDB and configure in your .env:');
  console.error('   MONGODB_URI=mongodb://127.0.0.1:27017/smart_sql_exam');
  console.error('=========================================\n');

  console.log('Attempting fallback to local MongoDB connection (mongodb://127.0.0.1:27017/smart_sql_exam)...');
  try {
    const m = await mongoose.connect('mongodb://127.0.0.1:27017/smart_sql_exam');
    console.log('Connected to local MongoDB successfully.');
    await initializeDatabase();
    return m;
  } catch (localErr) {
    console.error('Local MongoDB Connection Failed: ', localErr.message);
    console.error('All database connection attempts failed. Please verify your MongoDB configuration.');
  }
});

async function initializeDatabase() {
  const {
    Counter,
    Role,
    User,
    Student,
    Teacher,
    Subject,
    Category,
    QuestionBank,
    Question,
    Setting
  } = require('../models/mongoose.model');

  try {
    console.log('Initializing database data if empty...');

    // 1. Roles
    const rolesCount = await Role.countDocuments();
    if (rolesCount === 0) {
      await Role.insertMany([
        { _id: 1, name: 'Admin' },
        { _id: 2, name: 'Teacher' },
        { _id: 3, name: 'Student' }
      ]);
      console.log('Seeded Roles.');
    }

    // 2. Users
    const usersCount = await User.countDocuments();
    if (usersCount === 0) {
      await User.insertMany([
        { _id: 1, email: 'admin@platform.com', password_hash: '$2b$10$tMh4EeeZJgVfN8l.HExbQeS.jJ.tOa5zP48KkK4P263h/Y2B6hI.q', role_id: 1, is_active: 1, email_verified: 1 },
        { _id: 2, email: 'teacher1@platform.com', password_hash: '$2b$10$tMh4EeeZJgVfN8l.HExbQeS.jJ.tOa5zP48KkK4P263h/Y2B6hI.q', role_id: 2, is_active: 1, email_verified: 1 },
        { _id: 3, email: 'teacher2@platform.com', password_hash: '$2b$10$tMh4EeeZJgVfN8l.HExbQeS.jJ.tOa5zP48KkK4P263h/Y2B6hI.q', role_id: 2, is_active: 1, email_verified: 1 },
        { _id: 4, email: 'student1@platform.com', password_hash: '$2b$10$tMh4EeeZJgVfN8l.HExbQeS.jJ.tOa5zP48KkK4P263h/Y2B6hI.q', role_id: 3, is_active: 1, email_verified: 1 },
        { _id: 5, email: 'student2@platform.com', password_hash: '$2b$10$tMh4EeeZJgVfN8l.HExbQeS.jJ.tOa5zP48KkK4P263h/Y2B6hI.q', role_id: 3, is_active: 1, email_verified: 1 }
      ]);
      console.log('Seeded Users.');
    }

    // 3. Teachers
    const teachersCount = await Teacher.countDocuments();
    if (teachersCount === 0) {
      await Teacher.insertMany([
        { _id: 1, user_id: 2, full_name: 'Dr. Alan Turing', department: 'Computer Science' },
        { _id: 2, user_id: 3, full_name: 'Prof. Grace Hopper', department: 'Information Technology' }
      ]);
      console.log('Seeded Teachers.');
    }

    // 4. Students
    const studentsCount = await Student.countDocuments();
    if (studentsCount === 0) {
      await Student.insertMany([
        { _id: 1, user_id: 4, full_name: 'John Doe', roll_number: 'CS202601', class_section: 'Class A' },
        { _id: 2, user_id: 5, full_name: 'Jane Smith', roll_number: 'CS202602', class_section: 'Class B' }
      ]);
      console.log('Seeded Students.');
    }

    // 5. Subjects
    const subjectsCount = await Subject.countDocuments();
    if (subjectsCount === 0) {
      await Subject.insertMany([
        { _id: 1, name: 'Database Management Systems', description: 'Core database concepts, SQL queries, normalization, transactions.' },
        { _id: 2, name: 'Advanced Database Systems', description: 'Advanced query tuning, distributed databases, NoSQL.' }
      ]);
      console.log('Seeded Subjects.');
    }

    // 6. Categories
    const categoriesCount = await Category.countDocuments();
    if (categoriesCount === 0) {
      await Category.insertMany([
        { _id: 1, name: 'Basic SELECT Queries', description: 'Simple select queries with WHERE, ORDER BY, and LIMIT constraints.' },
        { _id: 2, name: 'SQL Aggregations', description: 'GROUP BY, HAVING, and aggregate functions like COUNT, SUM, AVG.' },
        { _id: 3, name: 'SQL Joins', description: 'INNER JOIN, LEFT JOIN, RIGHT JOIN, and self joins.' }
      ]);
      console.log('Seeded Categories.');
    }

    // 7. Question Banks
    const qbCount = await QuestionBank.countDocuments();
    if (qbCount === 0) {
      await QuestionBank.create({
        _id: 1,
        name: 'DBMS Semester 1 Question Bank',
        description: 'Collection of basic and intermediate SQL questions for first year undergraduates.'
      });
      console.log('Seeded Question Bank.');
    }

    // 8. Questions
    const questionsCount = await Question.countDocuments();
    if (questionsCount === 0) {
      await Question.insertMany([
        { _id: 1, question_bank_id: 1, category_id: 1, subject_id: 1, title: 'Select All Employees', description: 'Write a query to retrieve all columns from the employees table where department is "Engineering" and salary is greater than 70000.', points: 10, sql_template: "SELECT * FROM employees WHERE department = 'Engineering' AND salary > 70000;" },
        { _id: 2, question_bank_id: 1, category_id: 2, subject_id: 1, title: 'Average Salary per Department', description: 'Write a SQL query to calculate the average salary of employees in each department. Group the results by department name.', points: 15, sql_template: "SELECT department, AVG(salary) FROM employees GROUP BY department;" },
        { _id: 3, question_bank_id: 1, category_id: 3, subject_id: 1, title: 'Get Employee Managers', description: 'Write a query using an INNER JOIN to retrieve the employee name and their manager\'s name from the employees table joining the managers table on manager_id.', points: 20, sql_template: "SELECT e.name as employee_name, m.name as manager_name FROM employees e INNER JOIN employees m ON e.manager_id = m.id;" }
      ]);
      console.log('Seeded Questions.');
    }

    // 9. Settings
    const settingsCount = await Setting.countDocuments();
    if (settingsCount === 0) {
      await Setting.insertMany([
        { _id: 1, setting_key: 'platform_name', setting_value: 'Smart SQL Exam Platform' },
        { _id: 2, setting_key: 'allow_registration', setting_value: 'true' },
        { _id: 3, setting_key: 'theme', setting_value: 'dark' }
      ]);
      console.log('Seeded Settings.');
    }

    // 10. Guarantee teacher deep@gmail.com (password: 123456)
    let deepUser = await User.findOne({ email: 'deep@gmail.com' });
    if (deepUser) {
      // Force update
      deepUser.role_id = 2; // Teacher
      deepUser.password_hash = '$2b$10$yHA.mA9lDqnvqIv2QTl7nOlhCQlux4svJO0kKodi.tuDbY2P60FKu'; // '123456'
      deepUser.is_active = 1;
      deepUser.email_verified = 1;
      await deepUser.save();

      // Delete student record if exists
      await Student.deleteOne({ user_id: deepUser._id });
    } else {
      // Find max ID for users
      const maxUser = await User.findOne().sort({ _id: -1 });
      const nextUserId = (maxUser ? maxUser._id : 5) + 1;
      deepUser = await User.create({
        _id: nextUserId,
        email: 'deep@gmail.com',
        password_hash: '$2b$10$yHA.mA9lDqnvqIv2QTl7nOlhCQlux4svJO0kKodi.tuDbY2P60FKu',
        role_id: 2,
        is_active: 1,
        email_verified: 1
      });
    }

    // Ensure deep exists in teachers
    const deepTeacher = await Teacher.findOne({ user_id: deepUser._id });
    if (!deepTeacher) {
      const maxTeacher = await Teacher.findOne().sort({ _id: -1 });
      const nextTeacherId = (maxTeacher ? maxTeacher._id : 2) + 1;
      await Teacher.create({
        _id: nextTeacherId,
        user_id: deepUser._id,
        full_name: 'Deep Patel',
        department: 'Computer Science'
      });
    }
    console.log('Force verified deep@gmail.com is a Teacher user.');

    // 11. Sync all sequence counters
    const syncCounter = async (modelName, Model) => {
      const maxDoc = await Model.findOne().sort({ _id: -1 });
      const maxId = maxDoc ? maxDoc._id : 0;
      await Counter.findByIdAndUpdate(modelName, { seq: maxId }, { new: true, upsert: true });
    };

    await syncCounter('users', User);
    await syncCounter('teachers', Teacher);
    await syncCounter('students', Student);
    await syncCounter('subjects', Subject);
    await syncCounter('categories', Category);
    await syncCounter('question_banks', QuestionBank);
    await syncCounter('questions', Question);
    await syncCounter('settings', Setting);
    
    // Sync other collections
    const { Exam, ExamQuestion, Submission, SubmissionAnswer, Mark, Feedback, Notification, ActivityLog } = require('../models/mongoose.model');
    await syncCounter('exams', Exam);
    await syncCounter('exam_questions', ExamQuestion);
    await syncCounter('submissions', Submission);
    await syncCounter('submission_answers', SubmissionAnswer);
    await syncCounter('marks', Mark);
    await syncCounter('feedbacks', Feedback);
    await syncCounter('notifications', Notification);
    await syncCounter('activity_logs', ActivityLog);

    console.log('Sequence counters synced successfully.');
  } catch (err) {
    console.error('Table Auto-Initialization Failed: ', err.message);
  }
}

module.exports = {
  dbPromise,
  mongoose
};
