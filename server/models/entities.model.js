const {
  Student: MongoStudent,
  Teacher: MongoTeacher,
  Subject: MongoSubject,
  Category: MongoCategory,
  QuestionBank: MongoQuestionBank,
  getNextSequenceValue
} = require('./mongoose.model');

class Student {
  static async create({ userId, fullName, rollNumber, classSection }) {
    const nextId = await getNextSequenceValue('students');
    const student = await MongoStudent.create({
      _id: nextId,
      user_id: userId,
      full_name: fullName,
      roll_number: rollNumber,
      class_section: classSection
    });
    return student._id;
  }

  static async findByUserId(userId) {
    const student = await MongoStudent.findOne({ user_id: userId }).lean();
    if (!student) return null;
    return {
      ...student,
      id: student._id
    };
  }
}

class Teacher {
  static async create({ userId, fullName, department }) {
    const nextId = await getNextSequenceValue('teachers');
    const teacher = await MongoTeacher.create({
      _id: nextId,
      user_id: userId,
      full_name: fullName,
      department: department
    });
    return teacher._id;
  }

  static async findByUserId(userId) {
    const teacher = await MongoTeacher.findOne({ user_id: userId }).lean();
    if (!teacher) return null;
    return {
      ...teacher,
      id: teacher._id
    };
  }
}

class Subject {
  static async getAll() {
    const subjects = await MongoSubject.find().sort({ name: 1 }).lean();
    return subjects.map(s => ({
      ...s,
      id: s._id
    }));
  }

  static async create({ name, description }) {
    const nextId = await getNextSequenceValue('subjects');
    const subject = await MongoSubject.create({
      _id: nextId,
      name,
      description
    });
    return subject._id;
  }
}

class Category {
  static async getAll() {
    const categories = await MongoCategory.find().sort({ name: 1 }).lean();
    return categories.map(c => ({
      ...c,
      id: c._id
    }));
  }

  static async create({ name, description }) {
    const nextId = await getNextSequenceValue('categories');
    const category = await MongoCategory.create({
      _id: nextId,
      name,
      description
    });
    return category._id;
  }
}

class QuestionBank {
  static async getAll() {
    const banks = await MongoQuestionBank.find().sort({ name: 1 }).lean();
    return banks.map(b => ({
      ...b,
      id: b._id
    }));
  }

  static async create({ name, description }) {
    const nextId = await getNextSequenceValue('question_banks');
    const bank = await MongoQuestionBank.create({
      _id: nextId,
      name,
      description
    });
    return bank._id;
  }
}

module.exports = { Student, Teacher, Subject, Category, QuestionBank };
