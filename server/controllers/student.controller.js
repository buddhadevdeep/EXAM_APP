const { Exam, Submission, Grade } = require('../models/exam.model');
const { Student } = require('../models/entities.model');
const UtilityModel = require('../models/utility.model');

exports.getAvailableExams = async (req, res, next) => {
  try {
    const student = await Student.findByUserId(req.user.id);
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const { Exam: MongoExam, Subject: MongoSubject, Teacher: MongoTeacher, Submission: MongoSubmission } = require('../models/mongoose.model');
    const now = new Date();
    const exams = await MongoExam.find({
      is_published: 1,
      is_closed: 0,
      $or: [
        { end_time: null },
        { end_time: { $gt: now } }
      ]
    }).lean();

    // Filter exams based on allowed roll numbers list
    const filteredExams = exams.filter(e => {
      if (!e.allowed_roll_numbers || e.allowed_roll_numbers.length === 0) {
        return true;
      }
      return e.allowed_roll_numbers.includes(student.roll_number);
    });

    const subjectIds = filteredExams.map(e => e.subject_id);
    const teacherIds = filteredExams.map(e => e.teacher_id);
    const examIds = filteredExams.map(e => e._id);

    const [subjects, teachers, submissions] = await Promise.all([
      MongoSubject.find({ _id: { $in: subjectIds } }).lean(),
      MongoTeacher.find({ _id: { $in: teacherIds } }).lean(),
      MongoSubmission.find({ exam_id: { $in: examIds }, student_id: student.id }).sort({ created_at: 1 }).lean()
    ]);

    const subjectMap = new Map(subjects.map(s => [s._id, s.name]));
    const teacherMap = new Map(teachers.map(t => [t._id, t.full_name]));
    const submissionMap = new Map(submissions.map(sub => [sub.exam_id, sub]));

    const mappedResult = filteredExams.map(e => {
      const sub = submissionMap.get(e._id);
      let status = sub ? sub.status : null;

      // If the latest submission attempt is completed, but the exam was updated/republished after the submission:
      // Allow the student to start a new exam attempt (status = null)
      if (status && (status === 'Submitted' || status === 'Graded') && e.is_published === 1 && e.is_closed === 0) {
        const subCreatedAt = sub.created_at ? new Date(sub.created_at) : new Date(0);
        const examUpdatedAt = e.updated_at ? new Date(e.updated_at) : new Date(0);
        
        if (examUpdatedAt > new Date(subCreatedAt.getTime() + 2000)) {
          status = null;
        }
      }

      return {
        ...e,
        id: e._id,
        subject_name: subjectMap.get(e.subject_id) || '',
        teacher_name: teacherMap.get(e.teacher_id) || '',
        submission_status: status,
        submission_id: sub ? sub._id : null
      };
    });

    return res.status(200).json(mappedResult);
  } catch (error) {
    next(error);
  }
};

exports.getExamDetails = async (req, res, next) => {
  try {
    const { examId } = req.params;
    
    // Fetch non-dependent data in parallel
    const [exam, student, questions] = await Promise.all([
      Exam.getById(examId),
      Student.findByUserId(req.user.id),
      Exam.getExamQuestions(examId)
    ]);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }
    if (!exam.is_published) {
      return res.status(403).json({ message: 'This exam is not active or has been unpublished.' });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    // Check if exam restricts access to specific roll numbers
    if (exam.allowed_roll_numbers && exam.allowed_roll_numbers.length > 0) {
      if (!exam.allowed_roll_numbers.includes(student.roll_number)) {
        return res.status(403).json({ message: 'You are not authorized to take this exam. Access is restricted to specific roll numbers.' });
      }
    }

    // Verify timeline bounds
    const now = new Date();
    if (exam.start_time && new Date(exam.start_time) > now) {
      return res.status(403).json({ message: 'This exam is not active yet.' });
    }
    if (exam.end_time && new Date(exam.end_time) < now) {
      return res.status(403).json({ message: 'The access timeline for this exam has expired.' });
    }

    // Verify passcode if configured
    const clientCode = req.query.code;
    if (exam.access_code && exam.access_code !== clientCode) {
      return res.status(403).json({ message: 'Invalid exam entry passcode. Access Denied.' });
    }

    // Retrieve requested attempt or get/create a new draft
    const { Submission: MongoSubmission } = require('../models/mongoose.model');
    let submission;
    const submissionId = req.query.submissionId;
    if (submissionId) {
      submission = await MongoSubmission.findById(submissionId).lean();
      if (submission) {
        submission.id = submission._id;
      }
    } else {
      submission = await Submission.createDraftOrGet(student.id, examId);
    }

    // If final submission is already done, return answers too
    const answers = await Submission.getAnswers(submission.id);

    return res.status(200).json({
      exam,
      submission,
      questions: questions.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        points: q.points
      })), // Hide solution templates from students
      answers
    });
  } catch (error) {
    next(error);
  }
};

exports.saveAnswerDraft = async (req, res, next) => {
  try {
    const { submissionId, questionId, sqlQuery } = req.body;
    
    const { Submission: MongoSubmission } = require('../models/mongoose.model');
    const submission = await MongoSubmission.findById(submissionId).lean();
    if (submission && submission.status !== 'Draft') {
      return res.status(400).json({ message: 'Submission is locked. You cannot edit completed exams.' });
    }

    await Submission.saveAnswer(submissionId, questionId, sqlQuery);
    return res.status(200).json({ message: 'Draft saved successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.submitExam = async (req, res, next) => {
  try {
    const { submissionId } = req.body;
    
    const { Submission: MongoSubmission } = require('../models/mongoose.model');
    const submission = await MongoSubmission.findById(submissionId).lean();
    if (submission && submission.status !== 'Draft') {
      return res.status(400).json({ message: 'Exam has already been submitted.' });
    }

    await Submission.submitExam(submissionId);
    UtilityModel.logActivity(req.user.id, 'Exam Submission', `Submitted exam for submission ID ${submissionId}`).catch(err => {
      console.error('Failed to log activity in background:', err.message);
    });

    return res.status(200).json({ message: 'Exam submitted successfully!' });
  } catch (error) {
    next(error);
  }
};

exports.getStudentSubmissions = async (req, res, next) => {
  try {
    const student = await Student.findByUserId(req.user.id);
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const submissions = await Submission.getSubmissionsForStudent(student.id);
    return res.status(200).json(submissions);
  } catch (error) {
    next(error);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await UtilityModel.getNotifications(req.user.id);
    return res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
};

exports.requestVerification = async (req, res, next) => {
  try {
    const { submissionId } = req.body;
    
    const { Submission: MongoSubmission } = require('../models/mongoose.model');
    const submission = await MongoSubmission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    if (submission.status === 'Submitted') {
      return res.status(400).json({ message: 'Exam has already been submitted.' });
    }

    submission.status = 'PendingVerification';
    await submission.save();

    UtilityModel.logActivity(req.user.id, 'Exam Verification Requested', `Requested QR verification for submission ID ${submissionId}`).catch(err => {
      console.error('Failed to log activity in background:', err.message);
    });

    return res.status(200).json({ message: 'Verification requested. Please present the QR code to your teacher.' });
  } catch (error) {
    next(error);
  }
};

exports.getSubmissionStatus = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    
    const { Submission: MongoSubmission } = require('../models/mongoose.model');
    const submission = await MongoSubmission.findById(submissionId).lean();
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    return res.status(200).json({ status: submission.status });
  } catch (error) {
    next(error);
  }
};
