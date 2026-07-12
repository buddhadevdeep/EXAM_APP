const {
  User: MongoUser,
  Role: MongoRole,
  Student: MongoStudent,
  Teacher: MongoTeacher,
  Submission: MongoSubmission,
  SubmissionAnswer: MongoSubmissionAnswer,
  Mark: MongoMark,
  Feedback: MongoFeedback,
  getNextSequenceValue
} = require('./mongoose.model');

class User {
  static async findById(id) {
    const user = await MongoUser.findById(id).lean();
    if (!user) return null;
    const role = await MongoRole.findById(user.role_id).lean();
    return {
      ...user,
      id: user._id,
      role_name: role ? role.name : (user.role_id === 1 ? 'Admin' : (user.role_id === 2 ? 'Teacher' : 'Student'))
    };
  }

  static async findByEmail(email) {
    const user = await MongoUser.findOne({ email }).lean();
    if (!user) return null;
    const role = await MongoRole.findById(user.role_id).lean();
    return {
      ...user,
      id: user._id,
      role_name: role ? role.name : (user.role_id === 1 ? 'Admin' : (user.role_id === 2 ? 'Teacher' : 'Student'))
    };
  }

  static async create({ email, passwordHash, roleId, isActive = 1, emailVerified = 0, token = null }) {
    const nextId = await getNextSequenceValue('users');
    const user = await MongoUser.create({
      _id: nextId,
      email,
      password_hash: passwordHash,
      role_id: roleId,
      is_active: isActive,
      email_verified: emailVerified,
      verification_token: token
    });
    return user._id;
  }

  static async update(id, updates) {
    // Map password_hash if it exists in updates
    const updateObj = {};
    if (updates.password_hash !== undefined) updateObj.password_hash = updates.password_hash;
    if (updates.is_active !== undefined) updateObj.is_active = updates.is_active;
    if (updates.email_verified !== undefined) updateObj.email_verified = updates.email_verified;
    if (updates.verification_token !== undefined) updateObj.verification_token = updates.verification_token;
    if (updates.email !== undefined) updateObj.email = updates.email;
    if (updates.role_id !== undefined) updateObj.role_id = updates.role_id;

    if (Object.keys(updateObj).length > 0) {
      await MongoUser.findByIdAndUpdate(id, { $set: updateObj });
    }
  }

  static async getAll() {
    const users = await MongoUser.find().sort({ created_at: -1 }).lean();
    const students = await MongoStudent.find().lean();
    const teachers = await MongoTeacher.find().lean();
    const roles = await MongoRole.find().lean();

    const studentMap = new Map(students.map(s => [s.user_id, s]));
    const teacherMap = new Map(teachers.map(t => [t.user_id, t]));
    const roleMap = new Map(roles.map(r => [r._id, r.name]));

    return users.map(u => {
      const student = studentMap.get(u._id);
      const teacher = teacherMap.get(u._id);
      const roleName = roleMap.get(u.role_id) || 'Student';
      
      let fullName = 'Admin';
      if (student) fullName = student.full_name;
      else if (teacher) fullName = teacher.full_name;

      return {
        id: u._id,
        email: u.email,
        role_id: u.role_id,
        role_name: roleName,
        is_active: u.is_active,
        email_verified: u.email_verified,
        created_at: u.created_at,
        full_name: fullName
      };
    });
  }

  static async getTeachers() {
    const teachers = await MongoTeacher.find().lean();
    const users = await MongoUser.find().lean();
    const userMap = new Map(users.map(u => [u._id, u]));

    return teachers.map(t => {
      const u = userMap.get(t.user_id) || {};
      return {
        user_id: t.user_id,
        teacher_id: t._id,
        full_name: t.full_name,
        department: t.department,
        email: u.email,
        is_active: u.is_active
      };
    });
  }

  static async getStudents() {
    const students = await MongoStudent.find().lean();
    const users = await MongoUser.find().lean();
    const userMap = new Map(users.map(u => [u._id, u]));

    return students.map(s => {
      const u = userMap.get(s.user_id) || {};
      return {
        user_id: s.user_id,
        student_id: s._id,
        full_name: s.full_name,
        roll_number: s.roll_number,
        class_section: s.class_section,
        email: u.email,
        is_active: u.is_active
      };
    });
  }

  static async delete(id) {
    const student = await MongoStudent.findOne({ user_id: id }).lean();
    if (student) {
      const submissions = await MongoSubmission.find({ student_id: student._id }).lean();
      const submissionIds = submissions.map(s => s._id);
      
      if (submissionIds.length > 0) {
        await MongoSubmissionAnswer.deleteMany({ submission_id: { $in: submissionIds } });
        await MongoMark.deleteMany({ submission_id: { $in: submissionIds } });
        await MongoFeedback.deleteMany({ submission_id: { $in: submissionIds } });
        await MongoSubmission.deleteMany({ student_id: student._id });
      }
      await MongoStudent.deleteOne({ user_id: id });
    }
    
    const teacher = await MongoTeacher.findOne({ user_id: id }).lean();
    if (teacher) {
      await MongoTeacher.deleteOne({ user_id: id });
    }

    await MongoUser.deleteOne({ _id: id });
  }
}

module.exports = User;
