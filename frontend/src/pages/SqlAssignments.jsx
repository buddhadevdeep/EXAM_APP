import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE from '../config/api';
import { 
  FaClipboardList, FaPlus, FaTrash, FaEdit, FaSave, FaTimes, 
  FaDatabase, FaCheck, FaExclamationTriangle, FaListUl, FaRegClock 
} from 'react-icons/fa';

const SqlAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [assignedClass, setAssignedClass] = useState('All');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxAttempts, setMaxAttempts] = useState('1');
  const [questions, setQuestions] = useState([]);
  
  const [allowedRollNumbers, setAllowedRollNumbers] = useState([]);
  const [rollNumberInput, setRollNumberInput] = useState('');
  const [students, setStudents] = useState([]);

  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchAssignments();
    fetchDatabases();
    fetchStudents();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/sql-practice/assignments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAssignments(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load SQL Assignments.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabases = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/sql-practice/databases`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDatabases(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/teacher/students`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStudents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreate = () => {
    setTitle('');
    setDescription('');
    setDatabaseId(databases[0]?._id || '');
    setAssignedClass('All');
    setStartTime('');
    setEndTime('');
    setMaxAttempts('1');
    setQuestions([
      { question_text: 'Find all employees who earn more than 60000.', points: 5, difficulty: 'Easy', hints: 'Use a simple WHERE clause.', expected_sql: 'SELECT * FROM employees WHERE salary > 60000;' }
    ]);
    setAllowedRollNumbers([]);
    setRollNumberInput('');
    setEditId(null);
    setIsEditing(true);
    setMessage('');
    setErrorMsg('');
  };

  const handleOpenEdit = (assign) => {
    setTitle(assign.title);
    setDescription(assign.description);
    setDatabaseId(assign.sql_database_id);
    setAssignedClass(assign.assigned_class);
    setStartTime(assign.start_time ? new Date(assign.start_time).toISOString().slice(0, 16) : '');
    setEndTime(assign.end_time ? new Date(assign.end_time).toISOString().slice(0, 16) : '');
    setMaxAttempts(String(assign.max_attempts));
    setQuestions(
      assign.questions.map(q => ({
        question_text: q.question_text,
        points: q.points,
        difficulty: q.difficulty,
        hints: q.hints || '',
        expected_sql: q.expected_sql
      }))
    );
    setAllowedRollNumbers(assign.allowed_roll_numbers || []);
    setRollNumberInput('');
    setEditId(assign._id);
    setIsEditing(true);
    setMessage('');
    setErrorMsg('');
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { question_text: '', points: 5, difficulty: 'Easy', hints: '', expected_sql: '' }
    ]);
  };

  const handleRemoveQuestion = (qIdx) => {
    setQuestions(questions.filter((_, idx) => idx !== qIdx));
  };

  const handleQuestionChange = (qIdx, field, val) => {
    const updated = [...questions];
    updated[qIdx][field] = val;
    setQuestions(updated);
  };

  const handleAddRollNumber = () => {
    const inputs = rollNumberInput.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
    if (inputs.length === 0) return;

    const newRollNumbers = [...allowedRollNumbers];
    const invalidRollNumbers = [];
    const duplicateRollNumbers = [];

    const dbStudentMap = new Map(students.map(s => [String(s.roll_number).toLowerCase(), s]));

    for (const rollNum of inputs) {
      const student = dbStudentMap.get(rollNum.toLowerCase());
      if (!student) {
        invalidRollNumbers.push(rollNum);
      } else if (newRollNumbers.includes(String(student.roll_number))) {
        duplicateRollNumbers.push(String(student.roll_number));
      } else {
        newRollNumbers.push(String(student.roll_number));
      }
    }

    if (invalidRollNumbers.length > 0) {
      alert(`The following roll numbers do not exist: ${invalidRollNumbers.join(', ')}`);
    }

    if (duplicateRollNumbers.length > 0) {
      alert(`The following roll numbers are already added: ${duplicateRollNumbers.join(', ')}`);
    }

    setAllowedRollNumbers(newRollNumbers);
    setRollNumberInput('');
  };

  const handleRemoveRollNumber = (rollNum) => {
    setAllowedRollNumbers(allowedRollNumbers.filter(r => r !== rollNum));
  };

  const handleRollNumberKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddRollNumber();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');
    setErrorMsg('');

    if (!title.trim() || !databaseId || questions.length === 0) {
      setErrorMsg('Title, Database Selection, and at least one Question are required.');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim() || !q.expected_sql.trim()) {
        setErrorMsg(`Question #${i + 1} requires both query text and reference SQL.`);
        return;
      }
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      sqlDatabaseId: Number(databaseId),
      questions: questions.map(q => ({
        question_text: q.question_text.trim(),
        points: Number(q.points),
        difficulty: q.difficulty,
        hints: q.hints.trim(),
        expected_sql: q.expected_sql.trim()
      })),
      assignedClass: assignedClass.trim(),
      allowedRollNumbers: allowedRollNumbers,
      startTime: startTime || null,
      endTime: endTime || null,
      maxAttempts: Number(maxAttempts)
    };

    try {
      if (editId) {
        await axios.put(`${API_BASE}/api/sql-practice/assignments/${editId}`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMessage('Assignment updated successfully!');
      } else {
        await axios.post(`${API_BASE}/api/sql-practice/assignments`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMessage('Assignment created and published successfully!');
      }

      setIsEditing(false);
      fetchAssignments();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Error saving assignment.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this assignment? Past student attempts will prevent deletion.')) return;
    try {
      await axios.delete(`${API_BASE}/api/sql-practice/assignments/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage('Assignment deleted successfully.');
      fetchAssignments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete assignment.');
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1 text-primary d-flex align-items-center gap-2">
            <FaClipboardList /> SQL Assignments
          </h2>
          <p className="text-muted mb-0">Create graded database exercises, assign timeline metrics, and set maximum attempts.</p>
        </div>
        {!isEditing && databases.length > 0 && (
          <button className="btn btn-primary d-flex align-items-center gap-2 fw-bold" onClick={handleOpenCreate}>
            <FaPlus /> Create SQL Assignment
          </button>
        )}
      </div>

      {databases.length === 0 && !isEditing && (
        <div className="alert alert-warning py-3 d-flex align-items-center gap-2">
          <FaExclamationTriangle />
          <span>You must create at least one <strong>SQL Database</strong> model first before building assignments!</span>
        </div>
      )}

      {message && <div className="alert alert-success py-2">{message}</div>}
      {errorMsg && <div className="alert alert-danger py-2">{errorMsg}</div>}

      {isEditing ? (
        <div className="card glass-card p-4 shadow border border-secondary border-opacity-15 rounded-4 mx-auto" style={{ maxWidth: '1100px', width: '100%' }}>
          <h4 className="fw-bold mb-4 text-primary d-flex align-items-center gap-2">
            {editId ? <FaEdit /> : <FaPlus />} {editId ? 'Edit SQL Assignment' : 'Create SQL Assignment'}
          </h4>

          <form onSubmit={handleSave}>
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label text-muted small fw-bold text-uppercase">Assignment Title</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. Employee Database Basics" 
                  required 
                />
              </div>
              <div className="col-md-6">
                <label className="form-label text-muted small fw-bold text-uppercase">Target Database</label>
                <select 
                  className="form-select"
                  value={databaseId}
                  onChange={(e) => setDatabaseId(e.target.value)}
                  required
                >
                  {databases.map(db => (
                    <option key={db._id} value={db._id}>{db.name} (id: {db._id})</option>
                  ))}
                </select>
              </div>

              <div className="col-12">
                <label className="form-label text-muted small fw-bold text-uppercase">Description / Instructions</label>
                <textarea 
                  className="form-control" 
                  rows={2}
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Provide any guide instructions for query tasks..." 
                />
              </div>

              <div className="col-md-3">
                <label className="form-label text-muted small fw-bold text-uppercase">Assigned Class Section</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={assignedClass} 
                  onChange={(e) => setAssignedClass(e.target.value)} 
                  placeholder="e.g. Class A or All" 
                />
              </div>
              <div className="col-md-3">
                <label className="form-label text-muted small fw-bold text-uppercase">Max Submits Allowed</label>
                <select 
                  className="form-select"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                >
                  <option value="1">1 Attempt</option>
                  <option value="2">2 Attempts</option>
                  <option value="3">3 Attempts</option>
                  <option value="5">5 Attempts</option>
                  <option value="999">Unlimited Attempts</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label text-muted small fw-bold text-uppercase">Start Time</label>
                <input 
                  type="datetime-local" 
                  className="form-control" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)} 
                />
              </div>
              <div className="col-md-3">
                <label className="form-label text-muted small fw-bold text-uppercase">End Time / Deadline</label>
                <input 
                  type="datetime-local" 
                  className="form-control" 
                  value={endTime} 
                  onChange={(e) => setEndTime(e.target.value)} 
                />
              </div>

              <div className="col-12">
                <label className="form-label text-muted small fw-bold text-uppercase">Restrict to Roll Numbers (Optional)</label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder="e.g. CS202601, CS202602 or paste a list"
                    value={rollNumberInput}
                    onChange={e => setRollNumberInput(e.target.value)}
                    onKeyDown={handleRollNumberKeyDown}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAddRollNumber}
                  >
                    Add
                  </button>
                </div>
                <div className="d-flex flex-wrap gap-2 mt-2" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                  {allowedRollNumbers.map(rollNum => (
                    <span key={rollNum} className="badge bg-primary d-flex align-items-center gap-2 px-2 py-1" style={{ fontSize: '0.8rem', borderRadius: '12px' }}>
                      {rollNum}
                      <button
                        type="button"
                        className="btn-close btn-close-white"
                        style={{ width: '0.4em', height: '0.4em', padding: 0 }}
                        onClick={() => handleRemoveRollNumber(rollNum)}
                      />
                    </span>
                  ))}
                </div>
                <small className="text-muted d-block mt-1" style={{ fontSize: '0.72rem' }}>
                  Leave empty if all students in class can access. Press Enter or comma to add multiple tags.
                </small>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-20 pb-2 mb-4">
              <h5 className="fw-bold text-info mb-0 d-flex align-items-center gap-2">
                <FaListUl /> Question Tasks ({questions.length})
              </h5>
              <button type="button" className="btn btn-sm btn-outline-info d-flex align-items-center gap-1" onClick={handleAddQuestion}>
                <FaPlus /> Add Question
              </button>
            </div>

            {questions.map((q, qIdx) => (
              <div key={qIdx} className="card glass-card p-3 mb-4 rounded-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="badge bg-secondary">Question #{qIdx + 1}</span>
                  <button type="button" className="btn btn-xs btn-outline-danger" onClick={() => handleRemoveQuestion(qIdx)}>
                    Remove Question
                  </button>
                </div>

                <div className="row g-3">
                  <div className="col-md-9">
                    <label className="form-label text-muted small fw-bold">Question Prompt</label>
                    <input 
                       type="text" 
                      className="form-control" 
                      value={q.question_text} 
                      onChange={(e) => handleQuestionChange(qIdx, 'question_text', e.target.value)} 
                      placeholder="e.g. Write a query to select all customer names from Germany." 
                      required 
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label text-muted small fw-bold">Difficulty</label>
                    <select 
                      className="form-select"
                      value={q.difficulty}
                      onChange={(e) => handleQuestionChange(qIdx, 'difficulty', e.target.value)}
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label text-muted small fw-bold">Assignment Marks (Points)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={q.points} 
                      onChange={(e) => handleQuestionChange(qIdx, 'points', e.target.value)} 
                      min="1"
                      required 
                    />
                  </div>
                  <div className="col-md-9">
                    <label className="form-label text-muted small fw-bold">Hint (Optional)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={q.hints} 
                      onChange={(e) => handleQuestionChange(qIdx, 'hints', e.target.value)} 
                      placeholder="e.g. Recall that filter syntax uses WHERE country = 'Germany'." 
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label text-muted small fw-bold text-info">Reference Answer (SQL) (For easy manual grading review)</label>
                    <textarea 
                      className="form-control font-monospace small" 
                      rows={2}
                      value={q.expected_sql} 
                      onChange={(e) => handleQuestionChange(qIdx, 'expected_sql', e.target.value)} 
                      placeholder="SELECT name FROM customers WHERE country = 'Germany';" 
                      required 
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="d-flex gap-3 justify-content-end mt-4">
              <button type="submit" className="btn btn-success px-4 d-flex align-items-center gap-2 fw-bold shadow">
                <FaSave /> Save SQL Assignment
              </button>
              <button type="button" className="btn btn-outline-secondary px-4 fw-bold" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="row g-3">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="col-12">
              <div className="card glass-card p-5 text-center text-muted">
                <FaClipboardList className="fs-1 mb-3 text-warning" />
                <p className="mb-0">No SQL Assignments created yet.</p>
              </div>
            </div>
          ) : (
            assignments.map(a => (
              <div key={a._id} className="col-md-6 col-lg-4">
                <div className="card glass-card h-100 p-3 border border-secondary border-opacity-10 d-flex flex-column justify-content-between hover-pulse shadow">
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h5 className="fw-bold mb-0 text-info">{a.title}</h5>
                      <span className="badge bg-secondary">Class: {a.assigned_class}</span>
                    </div>
                    <p className="text-muted small mb-3">{a.description || 'No description provided.'}</p>
                    
                    <div className="mb-3 small">
                      <div className="d-flex align-items-center gap-2 mb-1 text-muted">
                        <FaDatabase size={12} className="text-info" />
                        <span>Database: <strong>{a.database_name}</strong></span>
                      </div>
                      <div className="d-flex align-items-center gap-2 mb-1 text-muted">
                        <FaListUl size={12} className="text-info" />
                        <span>{a.questions.length} Questions ({a.questions.reduce((sum, q) => sum + q.points, 0)} Total Marks)</span>
                      </div>
                      <div className="d-flex align-items-center gap-2 text-muted">
                        <FaRegClock size={12} className="text-info" />
                        <span>Max Submits: {a.max_attempts === 999 ? 'Unlimited' : a.max_attempts}</span>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex gap-2 justify-content-end border-top border-secondary border-opacity-10 pt-3 mt-auto">
                    <button className="btn btn-xs btn-outline-info px-3" onClick={() => handleOpenEdit(a)}>
                      <FaEdit /> Edit
                    </button>
                    <button className="btn btn-xs btn-outline-danger" onClick={() => handleDelete(a._id)}>
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SqlAssignments;
