const mongoose = require('mongoose');

// Counter Schema (Auto-Incrementing integer IDs)
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', CounterSchema);

async function getNextSequenceValue(sequenceName) {
  const doc = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

// Role Schema
const RoleSchema = new mongoose.Schema({
  _id: Number, // 1: Admin, 2: Teacher, 3: Student
  name: { type: String, required: true, unique: true },
  created_at: { type: Date, default: Date.now }
});
const Role = mongoose.model('Role', RoleSchema);

// User Schema
const UserSchema = new mongoose.Schema({
  _id: Number,
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role_id: { type: Number, required: true },
  is_active: { type: Number, default: 1 },
  email_verified: { type: Number, default: 0 },
  verification_token: { type: String, default: null },
  current_session_id: { type: String, default: null },
  last_active_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});
// Pre-save hook to update updated_at
UserSchema.pre('save', function() {
  this.updated_at = Date.now();
});
const User = mongoose.model('User', UserSchema);

// Student Schema
const StudentSchema = new mongoose.Schema({
  _id: Number,
  user_id: { type: Number, required: true, unique: true },
  full_name: { type: String, required: true },
  roll_number: { type: String, required: true, unique: true },
  class_section: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});
const Student = mongoose.model('Student', StudentSchema);

// Teacher Schema
const TeacherSchema = new mongoose.Schema({
  _id: Number,
  user_id: { type: Number, required: true, unique: true },
  full_name: { type: String, required: true },
  department: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});
const Teacher = mongoose.model('Teacher', TeacherSchema);

// Subject Schema
const SubjectSchema = new mongoose.Schema({
  _id: Number,
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});
const Subject = mongoose.model('Subject', SubjectSchema);

// Category Schema
const CategorySchema = new mongoose.Schema({
  _id: Number,
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});
const Category = mongoose.model('Category', CategorySchema);

// Question Bank Schema
const QuestionBankSchema = new mongoose.Schema({
  _id: Number,
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});
const QuestionBank = mongoose.model('QuestionBank', QuestionBankSchema);

// Question Schema
const QuestionSchema = new mongoose.Schema({
  _id: Number,
  question_bank_id: { type: Number, required: true },
  category_id: { type: Number, required: true },
  subject_id: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  points: { type: Number, default: 10 },
  sql_template: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});
const Question = mongoose.model('Question', QuestionSchema);

// Exam Schema
const ExamSchema = new mongoose.Schema({
  _id: Number,
  teacher_id: { type: Number, required: true },
  subject_id: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  total_marks: { type: Number, default: 100 },
  duration_minutes: { type: Number, default: 60 },
  is_published: { type: Number, default: 0 },
  is_closed: { type: Number, default: 0 },
  access_code: { type: String, default: null },
  start_time: { type: Date, default: null },
  end_time: { type: Date, default: null },
  allowed_roll_numbers: { type: [String], default: [] },
  database_schema: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});
ExamSchema.pre('save', function() {
  this.updated_at = Date.now();
});
ExamSchema.index({ is_published: 1, is_closed: 1, end_time: 1 });
ExamSchema.index({ teacher_id: 1 });
const Exam = mongoose.model('Exam', ExamSchema);

// ExamQuestion Schema
const ExamQuestionSchema = new mongoose.Schema({
  _id: Number,
  exam_id: { type: Number, required: true },
  question_id: { type: Number, required: true },
  order_index: { type: Number, default: 0 }
});
ExamQuestionSchema.index({ exam_id: 1, question_id: 1 }, { unique: true });
const ExamQuestion = mongoose.model('ExamQuestion', ExamQuestionSchema);

// Submission Schema
const SubmissionSchema = new mongoose.Schema({
  _id: Number,
  student_id: { type: Number, required: true },
  exam_id: { type: Number, required: true },
  status: { type: String, default: 'Draft' }, // Draft, Submitted, Graded, PendingVerification
  submitted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
});
SubmissionSchema.index({ student_id: 1, exam_id: 1 }, { unique: true });
SubmissionSchema.index({ exam_id: 1 });
const Submission = mongoose.model('Submission', SubmissionSchema);

// SubmissionAnswer Schema
const SubmissionAnswerSchema = new mongoose.Schema({
  _id: Number,
  submission_id: { type: Number, required: true },
  question_id: { type: Number, required: true },
  sql_query: { type: String, default: '' },
  submitted_at: { type: Date, default: Date.now }
});
SubmissionAnswerSchema.index({ submission_id: 1, question_id: 1 }, { unique: true });
const SubmissionAnswer = mongoose.model('SubmissionAnswer', SubmissionAnswerSchema);

// Mark Schema
const MarkSchema = new mongoose.Schema({
  _id: Number,
  submission_id: { type: Number, required: true },
  question_id: { type: Number, required: true },
  teacher_id: { type: Number, required: true },
  marks_obtained: { type: Number, default: 0.00 },
  feedback: { type: String, default: '' },
  graded_at: { type: Date, default: Date.now }
});
MarkSchema.index({ submission_id: 1, question_id: 1 }, { unique: true });
const Mark = mongoose.model('Mark', MarkSchema);

// Feedback Schema (overall exam feedback)
const FeedbackSchema = new mongoose.Schema({
  _id: Number,
  submission_id: { type: Number, required: true, unique: true },
  teacher_id: { type: Number, required: true },
  comments: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});
const Feedback = mongoose.model('Feedback', FeedbackSchema);

// Notification Schema
const NotificationSchema = new mongoose.Schema({
  _id: Number,
  user_id: { type: Number, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  is_read: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});
NotificationSchema.index({ user_id: 1, created_at: -1 });
const Notification = mongoose.model('Notification', NotificationSchema);

// ActivityLog Schema
const ActivityLogSchema = new mongoose.Schema({
  _id: Number,
  user_id: { type: Number, default: null },
  action: { type: String, required: true },
  details: { type: String, default: '' },
  ip_address: { type: String, default: null },
  created_at: { type: Date, default: Date.now }
});
ActivityLogSchema.index({ created_at: -1 });
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

// Setting Schema
const SettingSchema = new mongoose.Schema({
  _id: Number,
  setting_key: { type: String, required: true, unique: true },
  setting_value: { type: String, default: '' },
  updated_at: { type: Date, default: Date.now }
});
const Setting = mongoose.model('Setting', SettingSchema);

module.exports = {
  Counter,
  getNextSequenceValue,
  Role,
  User,
  Student,
  Teacher,
  Subject,
  Category,
  QuestionBank,
  Question,
  Exam,
  ExamQuestion,
  Submission,
  SubmissionAnswer,
  Mark,
  Feedback,
  Notification,
  ActivityLog,
  Setting
};
