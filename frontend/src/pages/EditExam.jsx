import API_BASE from '../config/api.js';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { FaSave, FaPlus } from 'react-icons/fa';

const EditExam = () => {
  const { examId } = useParams();
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [duration, setDuration] = useState(60);
  const [totalMarks, setTotalMarks] = useState(100);
  const [accessCode, setAccessCode] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [allowedRollNumbersText, setAllowedRollNumbersText] = useState('');
  const [databaseSchema, setDatabaseSchema] = useState('');
  const [students, setStudents] = useState([]);
  
  // Custom Question Form State
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customPoints, setCustomPoints] = useState(10);
  const [customSql, setCustomSql] = useState('');

  const navigate = useNavigate();



  const getMinDateTimeString = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return (new Date(now - tzOffset)).toISOString().slice(0, 16);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subRes, qRes, detailsRes, studentRes] = await Promise.all([
          axios.get(`${API_BASE}/api/shared/subjects`),
          axios.get(`${API_BASE}/api/shared/questions`),
          axios.get(`${API_BASE}/api/teacher/exams/${examId}`),
          axios.get(`${API_BASE}/api/teacher/students`)
        ]);

        setSubjects(subRes.data);
        setQuestions(qRes.data);
        setStudents(studentRes.data);

        if (detailsRes && detailsRes.data) {
          const ex = detailsRes.data.exam;
          setTitle(ex.title || '');
          setDescription(ex.description || '');
          setSubjectId(ex.subject_id || '');
          setDuration(ex.duration_minutes || 60);
          setTotalMarks(ex.total_marks || 100);
          setAccessCode(ex.access_code || '');
          
          if (ex.start_time) {
            // Convert to local datetime-local input string format
            const d = new Date(ex.start_time);
            const offset = d.getTimezoneOffset();
            const localDate = new Date(d.getTime() - (offset * 60 * 1000));
            setStartTime(localDate.toISOString().slice(0, 16));
          }
          if (ex.end_time) {
            const d = new Date(ex.end_time);
            const offset = d.getTimezoneOffset();
            const localDate = new Date(d.getTime() - (offset * 60 * 1000));
            setEndTime(localDate.toISOString().slice(0, 16));
          }

          if (detailsRes.data.questions) {
            setSelectedQuestions(detailsRes.data.questions.map(q => q.question_id || q.id));
          }

          setAllowedRollNumbersText(ex.allowed_roll_numbers ? ex.allowed_roll_numbers.join(', ') : '');
          setDatabaseSchema(ex.database_schema || '');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [examId]);

  const handleToggleQuestion = (id) => {
    if (selectedQuestions.includes(id)) {
      setSelectedQuestions(selectedQuestions.filter(qId => qId !== id));
    } else {
      setSelectedQuestions([...selectedQuestions, id]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!subjectId) {
      alert('Please select a subject');
      return;
    }
    if (selectedQuestions.length === 0) {
      alert('Please select at least one question');
      return;
    }
    if (!accessCode || accessCode.trim() === '') {
      alert('Exam passcode is mandatory.');
      return;
    }

    if (endTime) {
      const end = new Date(endTime);
      if (end <= new Date()) {
        alert('End Time (Expiry) must be in the future.');
        return;
      }
    }
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (end <= start) {
        alert('End Time (Expiry) must be after Start Time.');
        return;
      }
    }

    // Parse and validate roll numbers
    const rollNumbers = allowedRollNumbersText
      ? allowedRollNumbersText.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    if (rollNumbers.length > 0) {
      const dbStudentMap = new Map(students.map(s => [s.roll_number, s]));
      const invalidRollNumbers = [];
      const inactiveRollNumbers = [];

      for (const rollNum of rollNumbers) {
        const student = dbStudentMap.get(rollNum);
        if (!student) {
          invalidRollNumbers.push(rollNum);
        } else if (student.is_active !== 1) {
          inactiveRollNumbers.push(rollNum);
        }
      }

      if (invalidRollNumbers.length > 0) {
        alert(`Validation Error: The following roll numbers do not exist in the database: ${invalidRollNumbers.join(', ')}`);
        return;
      }

      if (inactiveRollNumbers.length > 0) {
        alert(`Validation Error: The following students are inactive and cannot be assigned to this exam: ${inactiveRollNumbers.join(', ')}`);
        return;
      }
    }

    const toUTCString = (dateTimeLocalStr) => {
      if (!dateTimeLocalStr) return null;
      const d = new Date(dateTimeLocalStr);
      return isNaN(d.getTime()) ? null : d.toISOString();
    };

    try {
      await axios.put(`${API_BASE}/api/teacher/exams/${examId}`, {
        subjectId: parseInt(subjectId),
        title,
        description,
        totalMarks: parseInt(totalMarks),
        durationMinutes: parseInt(duration),
        questionIds: selectedQuestions,
        accessCode,
        startTime: toUTCString(startTime),
        endTime: toUTCString(endTime),
        allowedRollNumbers: rollNumbers,
        databaseSchema: databaseSchema
      });
      alert('Exam updated successfully!');
      navigate('/teacher/dashboard');
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving exam');
    }
  };

  if (loading) return <div className="container mt-4"><div className="skeleton-line" /></div>;

  return (
    <div className="container mt-4 animated-fade">
      <h3 className="fw-bold mb-4">Edit SQL Exam</h3>
      
      <div className="row">
        <div className="col-md-5 mb-4">
          <div className="card glass-card p-4">
            <h5 className="fw-bold mb-3">Exam Configuration</h5>
            <form onSubmit={handleSave}>
              <div className="mb-3">
                <label className="form-label">Subject</label>
                <select 
                  className="form-select" required value={subjectId}
                  onChange={e => setSubjectId(e.target.value)}
                >
                  <option value="">Choose Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Exam Title</label>
                <input 
                  type="text" className="form-control" required value={title}
                  onChange={e => setTitle(e.target.value)} 
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Description / Instructions</label>
                <textarea 
                  className="form-control" rows="3" required value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Database Schema / Table Structures (Optional)</label>
                <textarea 
                  className="form-control font-monospace" rows="5" 
                  placeholder="e.g. CREATE TABLE users (id INT, name VARCHAR(50));"
                  value={databaseSchema}
                  onChange={e => setDatabaseSchema(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div className="row">
                <div className="col-6 mb-3">
                  <label className="form-label">Duration (Mins)</label>
                  <input 
                    type="number" className="form-control" required value={duration}
                    onChange={e => setDuration(parseInt(e.target.value))} 
                  />
                </div>
                <div className="col-6 mb-3">
                  <label className="form-label">Total Marks</label>
                  <input 
                    type="number" className="form-control" required value={totalMarks}
                    onChange={e => setTotalMarks(parseInt(e.target.value))} 
                  />
                </div>
              </div>

              <div className="mb-3 border-top pt-3">
                <h6 className="fw-bold text-primary mb-2">Access & Security Settings</h6>
                <div className="row mb-2">
                  <div className="col-6">
                    <label className="form-label small d-flex justify-content-between align-items-center">
                      <span>Start Time</span>
                      <button 
                        type="button" 
                        className="btn btn-link p-0 text-decoration-none text-primary fw-medium"
                        style={{ fontSize: '0.72rem' }}
                        onClick={() => {
                          const now = new Date();
                          const tzOffset = now.getTimezoneOffset() * 60000;
                          setStartTime(new Date(now - tzOffset).toISOString().slice(0, 16));
                        }}
                      >
                        ⚡ Today
                      </button>
                    </label>
                    <input 
                      type="datetime-local" className="form-control"
                      value={startTime} onChange={e => setStartTime(e.target.value)}
                      min={getMinDateTimeString()}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small d-flex justify-content-between align-items-center">
                      <span>End Time (Expiry)</span>
                      <button 
                        type="button" 
                        className="btn btn-link p-0 text-decoration-none text-primary fw-medium"
                        style={{ fontSize: '0.72rem' }}
                        onClick={() => {
                          const baseTime = startTime ? new Date(startTime) : new Date();
                          const end = new Date(baseTime.getTime() + (duration || 60) * 60000);
                          const tzOffset = end.getTimezoneOffset() * 60000;
                          setEndTime(new Date(end - tzOffset).toISOString().slice(0, 16));
                        }}
                      >
                        ⚡ Today
                      </button>
                    </label>
                    <input 
                      type="datetime-local" className="form-control"
                      value={endTime} onChange={e => setEndTime(e.target.value)}
                      min={startTime || getMinDateTimeString()}
                    />
                  </div>
                </div>
                 <div>
                  <label className="form-label small">Exam Passcode / Pin Code (Mandatory)</label>
                  <input 
                    type="text" className="form-control" placeholder="e.g. SQLTEST2026" required
                    value={accessCode} onChange={e => setAccessCode(e.target.value)}
                  />
                </div>

                <div className="mt-3">
                  <label className="form-label small">Restrict to Roll Numbers (Optional)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Enter comma-separated roll numbers (e.g. CS202601, CS202602)"
                    value={allowedRollNumbersText}
                    onChange={e => setAllowedRollNumbersText(e.target.value)}
                  />
                  <small className="text-muted d-block mt-1" style={{ fontSize: '0.72rem' }}>
                    Copy and paste roll numbers directly from Notepad. If left empty, all students can take the exam.
                  </small>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2 mt-2">
                <FaSave /> Save Changes
              </button>
            </form>
          </div>
        </div>

        <div className="col-md-7 mb-4">
          <div className="card glass-card p-4">
            <h5 className="fw-bold mb-3">{editingQuestionId ? 'Edit Selected Question' : 'Add Custom Question for this Exam'}</h5>
            
            <div className="p-3 border rounded mb-4 bg-light">
              <div className="mb-2">
                <label className="form-label small fw-bold">Question Title</label>
                <input 
                  type="text" className="form-control form-control-sm" placeholder="e.g. Find Highest Salary"
                  value={customTitle} onChange={e => setCustomTitle(e.target.value)}
                />
              </div>
              <div className="mb-2">
                <label className="form-label small fw-bold">Problem Description</label>
                <textarea 
                  className="form-control form-control-sm" rows="2" placeholder="Describe what query the student needs to write..."
                  value={customDesc} onChange={e => setCustomDesc(e.target.value)}
                />
              </div>
              <div className="row mb-3">
                <div className="col-6">
                  <label className="form-label small fw-bold">Points</label>
                  <input 
                    type="number" className="form-control form-control-sm" 
                    value={customPoints} onChange={e => setCustomPoints(parseInt(e.target.value))}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold">Correct SQL Solution Template</label>
                  <input 
                    type="text" className="form-control form-control-sm" placeholder="e.g. SELECT MAX(salary) FROM employees;"
                    value={customSql} onChange={e => setCustomSql(e.target.value)}
                  />
                </div>
              </div>

              <div className="d-flex gap-2">
                {editingQuestionId ? (
                  <>
                    <button 
                      type="button" className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                      onClick={async () => {
                        if (!customTitle || !customDesc || !customSql) {
                          alert('Please fill out all fields.');
                          return;
                        }
                        try {
                          await axios.put(`${API_BASE}/api/shared/questions/${editingQuestionId}`, {
                            title: customTitle,
                            description: customDesc,
                            points: customPoints,
                            sqlTemplate: customSql
                          });
                          alert('Question updated successfully!');
                          const qRes = await axios.get(`${API_BASE}/api/shared/questions`);
                          setQuestions(qRes.data);
                          
                          // Reset form
                          setEditingQuestionId(null);
                          setCustomTitle('');
                          setCustomDesc('');
                          setCustomPoints(10);
                          setCustomSql('');
                        } catch (err) {
                          alert('Error updating question.');
                        }
                      }}
                    >
                      Save Question Changes
                    </button>
                    <button 
                      type="button" className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setEditingQuestionId(null);
                        setCustomTitle('');
                        setCustomDesc('');
                        setCustomPoints(10);
                        setCustomSql('');
                      }}
                    >
                      Cancel Edit
                    </button>
                  </>
                ) : (
                  <button 
                    type="button" className="btn btn-sm btn-success d-flex align-items-center gap-1"
                    onClick={async () => {
                      if (!customTitle || !customDesc || !customSql) {
                        alert('Please fill out Title, Description, and SQL Template fields.');
                        return;
                      }

                      try {
                        const res = await axios.post(`${API_BASE}/api/shared/questions`, {
                          questionBankId: 1,
                          categoryId: 1,
                          subjectId: parseInt(subjectId) || 1,
                          title: customTitle,
                          description: customDesc,
                          points: customPoints,
                          sqlTemplate: customSql
                        });

                        alert('Question generated and added successfully!');
                        const qRes = await axios.get(`${API_BASE}/api/shared/questions`);
                        setQuestions(qRes.data);
                        setSelectedQuestions(prev => [...prev, res.data.questionId || res.data.id]);

                        setCustomTitle('');
                        setCustomDesc('');
                        setCustomPoints(10);
                        setCustomSql('');
                      } catch (err) {
                        alert(err.response?.data?.message || 'Error generating question.');
                      }
                    }}
                  >
                    <FaPlus size={12} /> Generate & Select Question
                  </button>
                )}
              </div>
            </div>

            <h5 className="fw-bold mb-3 border-top pt-3">Select Questions Pool ({selectedQuestions.length} selected)</h5>
            <div className="list-group list-group-flush overflow-auto" style={{ maxHeight: '400px' }}>
              {questions.map((q) => (
                <div key={q.id} className="list-group-item d-flex gap-3 align-items-start border-0 bg-transparent py-2 flex-column">
                  <div className="d-flex align-items-start w-100 gap-3">
                    <input 
                      type="checkbox" className="form-check-input mt-1" 
                      checked={selectedQuestions.includes(q.id)}
                      onChange={() => handleToggleQuestion(q.id)}
                    />
                    <div className="flex-grow-1">
                      <strong>{q.title}</strong>
                      <div className="text-muted small mb-1">{q.description}</div>
                      <div className="text-muted small mb-2 font-monospace bg-light p-1 rounded" style={{ fontSize: '0.8rem' }}>
                        Solution: {q.sql_template}
                      </div>
                      <span className="badge bg-secondary">{q.subject_name}</span> &bull; <span className="badge bg-info">{q.points} Points</span>
                    </div>
                    <div className="btn-group btn-group-sm">
                      <button 
                        type="button" className="btn btn-outline-primary"
                        onClick={() => {
                          setEditingQuestionId(q.id);
                          setCustomTitle(q.title || '');
                          setCustomDesc(q.description || '');
                          setCustomPoints(q.points || 10);
                          setCustomSql(q.sql_template || '');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        type="button" className="btn btn-outline-danger"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this question from the shared pool?')) {
                            axios.delete(`${API_BASE}/api/shared/questions/${q.id}`).then(() => {
                              alert('Question deleted!');
                              axios.get(`${API_BASE}/api/shared/questions`).then(r => setQuestions(r.data));
                              setSelectedQuestions(prev => prev.filter(id => id !== q.id));
                            }).catch(err => alert('Error deleting question.'));
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditExam;


