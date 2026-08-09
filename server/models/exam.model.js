const {
  Question: MongoQuestion,
  QuestionBank: MongoQuestionBank,
  Category: MongoCategory,
  Subject: MongoSubject,
  Exam: MongoExam,
  ExamQuestion: MongoExamQuestion,
  Submission: MongoSubmission,
  SubmissionAnswer: MongoSubmissionAnswer,
  Mark: MongoMark,
  Feedback: MongoFeedback,
  Teacher: MongoTeacher,
  Student: MongoStudent,
  User: MongoUser,
  getNextSequenceValue
} = require('./mongoose.model');

class Question {
  static async getAll() {
    const questions = await MongoQuestion.find().lean();
    const questionBanks = await MongoQuestionBank.find().lean();
    const categories = await MongoCategory.find().lean();
    const subjects = await MongoSubject.find().lean();
     
    const qbMap = new Map(questionBanks.map(b => [b._id, b.name]));
    const catMap = new Map(categories.map(c => [c._id, c.name]));
    const subMap = new Map(subjects.map(s => [s._id, s.name]));

    return questions.map(q => ({
      ...q,
      id: q._id,
      question_bank_name: qbMap.get(q.question_bank_id) || '',
      category_name: catMap.get(q.category_id) || '',
      subject_name: subMap.get(q.subject_id) || ''
    }));
  }

  static async create({ questionBankId, categoryId, subjectId, title, description, points, sqlTemplate }) {
    const nextId = await getNextSequenceValue('questions');
    const q = await MongoQuestion.create({
      _id: nextId,
      question_bank_id: questionBankId,
      category_id: categoryId,
      subject_id: subjectId,
      title,
      description,
      points,
      sql_template: sqlTemplate
    });
    return q._id;
  }
}

class Exam {
  static async create({ teacherId, subjectId, title, description, totalMarks, durationMinutes, accessCode = null, startTime = null, endTime = null, allowedRollNumbers = [], databaseSchema = '' }) {
    const nextId = await getNextSequenceValue('exams');
    const exam = await MongoExam.create({
      _id: nextId,
      teacher_id: teacherId,
      subject_id: subjectId,
      title,
      description,
      total_marks: totalMarks,
      duration_minutes: durationMinutes,
      access_code: accessCode,
      start_time: startTime ? new Date(startTime) : null,
      end_time: endTime ? new Date(endTime) : null,
      allowed_roll_numbers: allowedRollNumbers,
      database_schema: databaseSchema
    });
    return exam._id;
  }

  static async addQuestions(examId, questionIds) {
    for (const [idx, qId] of questionIds.entries()) {
      const nextEqId = await getNextSequenceValue('exam_questions');
      await MongoExamQuestion.create({
        _id: nextEqId,
        exam_id: examId,
        question_id: qId,
        order_index: idx
      });
    }
  }

  static async getExamQuestions(examId) {
    const examQuestions = await MongoExamQuestion.find({ exam_id: examId }).sort({ order_index: 1 }).lean();
    const questionIds = examQuestions.map(eq => eq.question_id);
    const questions = await MongoQuestion.find({ _id: { $in: questionIds } }).lean();
    const questionMap = new Map(questions.map(q => [q._id, q]));

    return examQuestions.map(eq => {
      const q = questionMap.get(eq.question_id) || {};
      return {
        ...q,
        id: q._id,
        order_index: eq.order_index
      };
    });
  }

  static async getAll() {
    const exams = await MongoExam.find().sort({ created_at: -1 }).lean();
    const teachers = await MongoTeacher.find().lean();
    const subjects = await MongoSubject.find().lean();

    const teacherMap = new Map(teachers.map(t => [t._id, t.full_name]));
    const subjectMap = new Map(subjects.map(s => [s._id, s.name]));

    return exams.map(e => ({
      ...e,
      id: e._id,
      teacher_name: teacherMap.get(e.teacher_id) || '',
      subject_name: subjectMap.get(e.subject_id) || ''
    }));
  }

  static async getById(id) {
    const exam = await MongoExam.findById(id).lean();
    if (!exam) return null;
    const [teacher, subject] = await Promise.all([
      MongoTeacher.findById(exam.teacher_id).lean(),
      MongoSubject.findById(exam.subject_id).lean()
    ]);
    return {
      ...exam,
      id: exam._id,
      teacher_name: teacher ? teacher.full_name : '',
      subject_name: subject ? subject.name : ''
    };
  }

  static async update(id, updates) {
    const updateObj = {};
    const fields = ['subject_id', 'title', 'description', 'total_marks', 'duration_minutes', 'is_published', 'is_closed', 'access_code', 'start_time', 'end_time', 'allowed_roll_numbers', 'database_schema'];
    fields.forEach(f => {
      if (updates[f] !== undefined) {
        if ((f === 'start_time' || f === 'end_time')) {
          updateObj[f] = updates[f] ? new Date(updates[f]) : null;
        } else if (f === 'subject_id' || f === 'total_marks' || f === 'duration_minutes' || f === 'is_published' || f === 'is_closed') {
          updateObj[f] = updates[f] !== null ? parseInt(updates[f]) : null;
        } else {
          updateObj[f] = updates[f];
        }
      }
    });
    if (Object.keys(updateObj).length > 0) {
      await MongoExam.findByIdAndUpdate(id, { $set: updateObj });
    }
  }
}

class Submission {
  static async createDraftOrGet(studentId, examId) {
    let submission = await MongoSubmission.findOne({ student_id: studentId, exam_id: examId }).lean();
    if (submission) {
      return {
        ...submission,
        id: submission._id
      };
    }
    const nextId = await getNextSequenceValue('submissions');
    const subDoc = await MongoSubmission.create({
      _id: nextId,
      student_id: studentId,
      exam_id: examId,
      status: 'Draft'
    });
    return {
      ...subDoc.toObject(),
      id: subDoc._id
    };
  }

  static async saveAnswer(submissionId, questionId, sqlQuery) {
    const updated = await MongoSubmissionAnswer.findOneAndUpdate(
      { submission_id: submissionId, question_id: questionId },
      { $set: { sql_query: sqlQuery, submitted_at: new Date() } },
      { new: true }
    );
    if (!updated) {
      const nextId = await getNextSequenceValue('submission_answers');
      await MongoSubmissionAnswer.create({
        _id: nextId,
        submission_id: submissionId,
        question_id: questionId,
        sql_query: sqlQuery
      });
    }
  }

  static async getAnswers(submissionId) {
    const answers = await MongoSubmissionAnswer.find({ submission_id: submissionId }).lean();
    return answers.map(a => ({
      ...a,
      id: a._id
    }));
  }

  static async submitExam(submissionId) {
    await MongoSubmission.findByIdAndUpdate(submissionId, {
      $set: { status: 'Submitted', submitted_at: Date.now() }
    });
  }

  static async getSubmissionsForExam(examId) {
    const numericExamId = Number(examId);
    const exam = await MongoExam.findById(numericExamId).lean();
    if (!exam) return [];

    const submissions = await MongoSubmission.find({ exam_id: numericExamId }).lean();
    
    // Fetch active students by mapping active user ids
    const students = await MongoStudent.find().lean();
    const userIds = students.map(s => s.user_id);
    const activeUsers = await MongoUser.find({ _id: { $in: userIds }, is_active: 1 }).lean();
    const activeUserIds = new Set(activeUsers.map(u => u._id));
    const activeStudents = students.filter(s => activeUserIds.has(s.user_id));

    const allowedSet = new Set((exam.allowed_roll_numbers || []).map(r => String(r).trim().toLowerCase()));
    const isAssigned = (student) => {
      if (allowedSet.size === 0) return true;
      return allowedSet.has(String(student.roll_number).trim().toLowerCase());
    };

    const studentIdsWithSub = submissions.map(sub => sub.student_id);
    const studentsWithSub = await MongoStudent.find({ _id: { $in: studentIdsWithSub } }).lean();

    const allKnownStudentsMap = new Map();
    studentsWithSub.forEach(s => allKnownStudentsMap.set(s._id.toString(), s));
    activeStudents.forEach(s => allKnownStudentsMap.set(s._id.toString(), s));

    const finalSubmissions = [];
    const processedStudentIds = new Set();

    // 1. Add all existing submissions (Draft, Submitted, Graded)
    for (const sub of submissions) {
      const studentIdStr = sub.student_id.toString();
      processedStudentIds.add(studentIdStr);
      const s = allKnownStudentsMap.get(studentIdStr) || {};
      finalSubmissions.push({
        ...sub,
        id: sub._id,
        student_name: s.full_name || 'Unknown Student',
        roll_number: s.roll_number || '',
        class_section: s.class_section || ''
      });
    }

    // 2. Add virtual "Not Started" submissions for active, assigned students who haven't started yet (only if exam is open)
    if (exam.is_closed === 0) {
      for (const s of activeStudents) {
        const studentIdStr = s._id.toString();
        if (processedStudentIds.has(studentIdStr)) continue;

        if (isAssigned(s)) {
          finalSubmissions.push({
            id: `virtual_${s._id}`,
            exam_id: examId,
            student_id: s._id,
            status: 'Not Started',
            submitted_at: null,
            total_marks: 0,
            student_name: s.full_name || '',
            roll_number: s.roll_number || '',
            class_section: s.class_section || ''
          });
        }
      }
    }

    return finalSubmissions;
  }

  static async getSubmissionsForStudent(studentId) {
    const student = await MongoStudent.findById(studentId).lean();
    if (!student) return [];

    const submissions = await MongoSubmission.find({ student_id: studentId }).lean();
    const subMap = new Map(submissions.map(sub => [sub.exam_id, sub]));

    // Fetch all active (published and not closed) exams
    const activeExams = await MongoExam.find({ is_published: 1, is_closed: 0 }).lean();

    // Filter exams allowed for this student based on roll number restriction
    const assignedExams = activeExams.filter(e => {
      if (!e.allowed_roll_numbers || e.allowed_roll_numbers.length === 0) {
        return true;
      }
      return e.allowed_roll_numbers.includes(student.roll_number);
    });

    const assignedExamIds = new Set(assignedExams.map(e => e._id));

    // Also fetch any exams that are closed but the student has a submission for (to preserve history)
    const closedExamIds = submissions
      .map(sub => sub.exam_id)
      .filter(examId => !assignedExamIds.has(examId));
      
    const closedExams = await MongoExam.find({ _id: { $in: closedExamIds } }).lean();
    
    // Combine all relevant exams
    const allExams = [...assignedExams, ...closedExams];
    const examMap = new Map(allExams.map(e => [e._id, e]));

    // Fetch subjects, marks and feedbacks for all these exams/submissions in parallel
    const subjectIds = allExams.map(e => e.subject_id);
    const submissionIds = submissions.map(sub => sub._id);

    const [subjects, marks, feedbackDocs] = await Promise.all([
      MongoSubject.find({ _id: { $in: subjectIds } }).lean(),
      MongoMark.find({ submission_id: { $in: submissionIds } }).lean(),
      MongoFeedback.find({ submission_id: { $in: submissionIds } }).lean()
    ]);

    const subjectMap = new Map(subjects.map(s => [s._id, s.name]));

    const marksSumMap = new Map();
    marks.forEach(m => {
      const current = marksSumMap.get(m.submission_id) || 0;
      marksSumMap.set(m.submission_id, current + m.marks_obtained);
    });

    const feedbackMap = new Map(feedbackDocs.map(f => [f.submission_id, f.comments]));

    // Now map them: we want to map all exams that the student is assigned to!
    const results = allExams.map(e => {
      const sub = subMap.get(e._id);
      
      let status = 'Not Started';
      let submissionId = null;
      let submittedAt = null;
      let marksObtained = 0;
      let teacherComments = null;

      if (sub) {
        submissionId = sub._id;
        submittedAt = sub.submitted_at;
        marksObtained = marksSumMap.get(sub._id) || 0;
        teacherComments = feedbackMap.get(sub._id) || null;
        
        if (sub.status === 'Draft') {
          if (e.is_closed === 1) {
            status = 'Absent'; // Closed and still draft means Absent
          } else {
            status = 'In Progress'; // Active and draft means In Progress
          }
        } else {
          status = sub.status; // Submitted, Graded, PendingVerification
        }
      } else {
        if (e.is_closed === 1) {
          status = 'Absent'; // Closed and not started means Absent
        } else {
          status = 'Not Started'; // Active and not started means Not Started
        }
      }

      return {
        id: submissionId || `temp-${e._id}`,
        exam_id: e._id,
        exam_title: e.title,
        total_marks: e.total_marks,
        duration_minutes: e.duration_minutes,
        subject_name: subjectMap.get(e.subject_id) || '',
        status,
        submitted_at: submittedAt,
        marks_obtained: status === 'Graded' ? marksObtained : null,
        teacher_comments: teacherComments,
        is_closed: e.is_closed
      };
    });

    return results;
  }

  static async getSubmissionDetails(submissionId) {
    const submission = await MongoSubmission.findById(submissionId).lean();
    if (!submission) return null;
    const student = await MongoStudent.findById(submission.student_id).lean();
    const exam = await MongoExam.findById(submission.exam_id).lean();

    return {
      ...submission,
      id: submission._id,
      student_name: student ? student.full_name : '',
      roll_number: student ? student.roll_number : '',
      class_section: student ? student.class_section : '',
      exam_title: exam ? exam.title : '',
      total_marks: exam ? exam.total_marks : 0
    };
  }
}

class Grade {
  static async saveMarkAndFeedback(submissionId, questionId, teacherId, marksObtained, feedbackText) {
    let mark = await MongoMark.findOne({ submission_id: submissionId, question_id: questionId });
    if (mark) {
      mark.marks_obtained = marksObtained;
      mark.feedback = feedbackText;
      mark.graded_at = Date.now();
      await mark.save();
    } else {
      const nextId = await getNextSequenceValue('marks');
      await MongoMark.create({
        _id: nextId,
        submission_id: submissionId,
        question_id: questionId,
        teacher_id: teacherId,
        marks_obtained: marksObtained,
        feedback: feedbackText
      });
    }
  }

  static async getGrades(submissionId) {
    const marks = await MongoMark.find({ submission_id: submissionId }).lean();
    return marks.map(m => ({
      ...m,
      id: m._id
    }));
  }

  static async saveOverallFeedback(submissionId, teacherId, comments) {
    let feedback = await MongoFeedback.findOne({ submission_id: submissionId });
    if (feedback) {
      feedback.comments = comments;
      feedback.created_at = Date.now();
      await feedback.save();
    } else {
      const nextId = await getNextSequenceValue('feedbacks');
      await MongoFeedback.create({
        _id: nextId,
        submission_id: submissionId,
        teacher_id: teacherId,
        comments
      });
    }
    await MongoSubmission.findByIdAndUpdate(submissionId, { $set: { status: 'Graded' } });
  }

  static async getOverallFeedback(submissionId) {
    const feedback = await MongoFeedback.findOne({ submission_id: submissionId }).lean();
    if (!feedback) return null;
    return {
      ...feedback,
      id: feedback._id
    };
  }
}

module.exports = { Question, Exam, Submission, Grade };
