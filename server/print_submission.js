const mongoose = require('mongoose');
const { dbPromise } = require('./config/db');
const { SqlSubmission, SqlAssignment, Student, User } = require('./models/mongoose.model');

async function run() {
  await dbPromise;
  const submission = await SqlSubmission.findById(1).lean();
  console.log('Submission:', submission);
  if (submission) {
    const assignment = await SqlAssignment.findById(submission.sql_assignment_id).lean();
    console.log('Assignment:', assignment);
    const student = await Student.findById(submission.student_id).lean();
    console.log('Student:', student);
    if (student) {
      const user = await User.findById(student.user_id).lean();
      console.log('User:', user);
    }
  }
  await mongoose.disconnect();
}

run();
