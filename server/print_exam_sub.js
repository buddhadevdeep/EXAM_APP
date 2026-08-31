const mongoose = require('mongoose');
const { dbPromise } = require('./config/db');
const { Submission, Student, Mark, Feedback } = require('./models/mongoose.model');

async function run() {
  await dbPromise;
  const submissions = await Submission.find({ exam_id: 1 }).lean();
  console.log('Submissions count:', submissions.length);
  console.log('Submissions:', JSON.stringify(submissions, null, 2));
  const subIds = submissions.map(s => s._id);
  const marks = await Mark.find({ submission_id: { $in: subIds } }).lean();
  console.log('Marks:', JSON.stringify(marks, null, 2));
  const feedbacks = await Feedback.find({ submission_id: { $in: subIds } }).lean();
  console.log('Feedbacks:', JSON.stringify(feedbacks, null, 2));
  await mongoose.disconnect();
}
run();
