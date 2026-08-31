const { PracticeSchema, getNextSequenceValue, Teacher: MongoTeacher } = require('../models/mongoose.model');
const { Teacher, Student } = require('../models/entities.model');
const UtilityModel = require('../models/utility.model');

// Get all practice schemas (default templates and custom ones)
exports.getPracticeSchemas = async (req, res, next) => {
  try {
    let list;
    if (req.user.role === 'Teacher' || req.user.role === 'Admin') {
      list = await PracticeSchema.find().sort({ created_at: -1 }).lean();
    } else {
      // Find student and filter by class_section
      const studentProfile = await Student.findByUserId(req.user.id);
      const section = studentProfile ? studentProfile.class_section : '';
      list = await PracticeSchema.find({
        $or: [
          { assigned_class: 'All' },
          { assigned_class: section }
        ]
      }).sort({ created_at: -1 }).lean();
    }
    
    // We can also attach teacher names if available
    const teachers = await MongoTeacher.find().lean();
    const teacherMap = new Map(teachers.map(t => [t._id || t.id, t.full_name]));
    
    const mapped = list.map(s => ({
      ...s,
      id: s._id,
      teacher_name: teacherMap.get(s.teacher_id) || 'System Admin'
    }));

    return res.status(200).json(mapped);
  } catch (error) {
    next(error);
  }
};

// Create a new practice schema (Teacher only)
exports.createPracticeSchema = async (req, res, next) => {
  try {
    const { title, description, schemaSql, assignedClass } = req.body;
    
    const teacher = await Teacher.findByUserId(req.user.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found.' });
    }

    const nextId = await getNextSequenceValue('practice_schemas');
    const newSchema = await PracticeSchema.create({
      _id: nextId,
      teacher_id: teacher.id,
      title,
      description,
      schema_sql: schemaSql,
      assigned_class: assignedClass || 'All'
    });

    await UtilityModel.logActivity(req.user.id, 'Create Practice Schema', `Created SQL Assignment (ID: ${nextId}): ${title}`);
    return res.status(201).json({ message: 'Practice assignment created successfully!', schema: newSchema });
  } catch (error) {
    next(error);
  }
};

// Update a practice schema (Teacher only)
exports.updatePracticeSchema = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, schemaSql, assignedClass } = req.body;

    const teacher = await Teacher.findByUserId(req.user.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found.' });
    }

    const schema = await PracticeSchema.findById(id);
    if (!schema) {
      return res.status(404).json({ message: 'Practice assignment not found.' });
    }

    // Auth check: Make sure this teacher owns this schema
    if (schema.teacher_id !== teacher.id) {
      return res.status(403).json({ message: 'Access Denied: You do not own this schema.' });
    }

    schema.title = title;
    schema.description = description;
    schema.schema_sql = schemaSql;
    schema.assigned_class = assignedClass || 'All';
    await schema.save();

    await UtilityModel.logActivity(req.user.id, 'Update Practice Schema', `Updated SQL Assignment (ID: ${id})`);
    return res.status(200).json({ message: 'Practice assignment updated successfully!', schema });
  } catch (error) {
    next(error);
  }
};

// Delete a practice schema (Teacher only)
exports.deletePracticeSchema = async (req, res, next) => {
  try {
    const { id } = req.params;

    const teacher = await Teacher.findByUserId(req.user.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found.' });
    }

    const schema = await PracticeSchema.findById(id);
    if (!schema) {
      return res.status(404).json({ message: 'Practice schema not found.' });
    }

    // Auth check
    if (schema.teacher_id !== teacher.id) {
      return res.status(403).json({ message: 'Access Denied: You do not own this schema.' });
    }

    await PracticeSchema.deleteOne({ _id: id });
    await UtilityModel.logActivity(req.user.id, 'Delete Practice Schema', `Deleted SQL Schema (ID: ${id})`);
    return res.status(200).json({ message: 'Practice schema deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
