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
  const [allowedRollNumbers, setAllowedRollNumbers] = useState([]);
  const [rollNumberInput, setRollNumberInput] = useState('');
  const [databaseSchema, setDatabaseSchema] = useState('');
  const [students, setStudents] = useState([]);
  const [step, setStep] = useState(1);
  
  // Custom Question Form State
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customPoints, setCustomPoints] = useState(10);
  const [customSql, setCustomSql] = useState('');

  const navigate = useNavigate();

  const validateStep1 = () => {
    if (!subjectId) { alert('Please select a subject'); return false; }
    if (!title.trim()) { alert('Please enter an exam title'); return false; }
    if (!description.trim()) { alert('Please enter exam instructions'); return false; }
    if (!duration) { alert('Please enter a valid duration'); return false; }
    if (!totalMarks) { alert('Please enter total marks'); return false; }
    if (!accessCode.trim()) { alert('Please enter an exam passcode'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (endTime) {
      const end = new Date(endTime);
      if (end <= new Date()) {
        alert('End Time (Expiry) must be in the future.');
        return false;
      }
    }
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (end <= start) {
        alert('End Time (Expiry) must be after Start Time.');
        return false;
      }
    }
    return true;
  };

  const handleAddRollNumber = () => {
    const inputs = rollNumberInput.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
    if (inputs.length === 0) return;

    const newRollNumbers = [...allowedRollNumbers];
    const invalidRollNumbers = [];
    const inactiveRollNumbers = [];
    const duplicateRollNumbers = [];

    const dbStudentMap = new Map(students.map(s => [String(s.roll_number).toLowerCase(), s]));

    for (const rollNum of inputs) {
      const student = dbStudentMap.get(rollNum.toLowerCase());
      if (!student) {
        invalidRollNumbers.push(rollNum);
      } else if (student.is_active !== 1) {
        inactiveRollNumbers.push(String(student.roll_number));
      } else if (newRollNumbers.includes(String(student.roll_number))) {
        duplicateRollNumbers.push(String(student.roll_number));
      } else {
        newRollNumbers.push(String(student.roll_number));
      }
    }

    if (invalidRollNumbers.length > 0) {
      alert(`The following roll numbers do not exist in the database and were not added: ${invalidRollNumbers.join(', ')}`);
    }

    if (inactiveRollNumbers.length > 0) {
      alert(`The following students are inactive and cannot be assigned to this exam: ${inactiveRollNumbers.join(', ')}`);
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

          setAllowedRollNumbers(ex.allowed_roll_numbers || []);
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
    if (selectedQuestions.length === 0) {
      alert('Please select at least one question');
      return;
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
        allowedRollNumbers: allowedRollNumbers,
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
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
        <div>
          <h3 className="fw-bold mb-0 text-gradient text-uppercase">Edit SQL Exam</h3>
          <p className="text-muted small mb-0">Modify exam parameters and update assigned questions</p>
        </div>
      </div>

      {/* Stepper Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 glass-card p-3">
        <div className="d-flex align-items-center gap-2 cursor-pointer" onClick={() => step > 1 && setStep(1)}>
          <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold transition-all ${
            step === 1 ? 'bg-primary text-white shadow-sm scale-up' : step > 1 ? 'bg-success text-white' : 'bg-secondary bg-opacity-25 text-muted'
          }`} style={{ width: '35px', height: '35px', fontSize: '0.9rem' }}>
            {step > 1 ? '✓' : '1'}
          </div>
          <span className={`small fw-bold ${step === 1 ? 'text-primary' : 'text-muted'}`}>1. Exam Profile</span>
        </div>
        <div className="flex-grow-1 mx-3 border-bottom border-2 border-dashed border-secondary" style={{ opacity: 0.3 }} />
        <div className="d-flex align-items-center gap-2 cursor-pointer" onClick={() => step > 2 && setStep(2)}>
          <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold transition-all ${
            step === 2 ? 'bg-primary text-white shadow-sm scale-up' : step > 2 ? 'bg-success text-white' : 'bg-secondary bg-opacity-25 text-muted'
          }`} style={{ width: '35px', height: '35px', fontSize: '0.9rem' }}>
            {step > 2 ? '✓' : '2'}
          </div>
          <span className={`small fw-bold ${step === 2 ? 'text-primary' : 'text-muted'}`}>2. Security & Schema</span>
        </div>
        <div className="flex-grow-1 mx-3 border-bottom border-2 border-dashed border-secondary" style={{ opacity: 0.3 }} />
        <div className="d-flex align-items-center gap-2">
          <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold transition-all ${
            step === 3 ? 'bg-primary text-white shadow-sm scale-up' : 'bg-secondary bg-opacity-25 text-muted'
          }`} style={{ width: '35px', height: '35px', fontSize: '0.9rem' }}>
            3
          </div>
          <span className={`small fw-bold ${step === 3 ? 'text-primary' : 'text-muted'}`}>3. Questions Pool</span>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* Step 1: Exam Profile */}
        {step === 1 && (
          <div className="card glass-card p-4 shadow-sm border-0 animate-fade">
            <h5 className="fw-bold text-primary mb-4 pb-2 border-bottom">1. Configure Exam Profile</h5>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label small fw-bold">Subject / Course</label>
                <select 
                  className="form-select py-2" required value={subjectId}
                  onChange={e => setSubjectId(e.target.value)}
                >
                  <option value="">Choose Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="col-md-8">
                <label className="form-label small fw-bold">Exam Title</label>
                <input 
                  type="text" className="form-control py-2" required value={title}
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="e.g. Midterm SQL Assessment"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold">Duration (Minutes)</label>
                <input 
                  type="number" className="form-control py-2" required value={duration}
                  onChange={e => setDuration(parseInt(e.target.value))} 
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold">Total Marks</label>
                <input 
                  type="number" className="form-control py-2" required value={totalMarks}
                  onChange={e => setTotalMarks(parseInt(e.target.value))} 
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-bold">Exam PIN / Passcode (Mandatory)</label>
                <input 
                  type="text" className="form-control py-2" placeholder="e.g. SQLTEST" required
                  value={accessCode} onChange={e => setAccessCode(e.target.value)}
                />
              </div>
              <div className="col-12">
                <label className="form-label small fw-bold">Description & Instructions</label>
                <textarea 
                  className="form-control" rows="5" required value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Explain requirements, guidelines, grading policies, and instructions for the student..."
                />
              </div>
            </div>

            <div className="d-flex justify-content-end mt-4 pt-3 border-top">
              <button 
                type="button" 
                className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2"
                onClick={() => validateStep1() && setStep(2)}
              >
                Next: Security & Schema →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Security & Schema */}
        {step === 2 && (
          <div className="row g-4 animate-fade">
            {/* Left Column: Security Settings */}
            <div className="col-lg-6">
              <div className="card glass-card p-4 h-100 shadow-sm border-0">
                <h5 className="fw-bold text-primary mb-4 pb-2 border-bottom">2. Access Control & Schedule</h5>
                
                <div className="mb-3">
                  <label className="form-label small fw-bold d-flex justify-content-between align-items-center">
                    <span>Start Time (Optional)</span>
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

                <div className="mb-4">
                  <label className="form-label small fw-bold d-flex justify-content-between align-items-center">
                    <span>End Time / Expiry (Optional)</span>
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

                <div className="mb-3">
                  <label className="form-label small fw-bold text-primary">Restrict to Roll Numbers (Optional)</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. CS202601, CS202602 or paste a list from Notepad"
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
                </div>
                
                <div className="d-flex flex-wrap gap-2 mt-2 max-height-scroll" style={{ maxHeight: '120px', overflowY: 'auto' }}>
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
                <small className="text-muted d-block mt-2" style={{ fontSize: '0.72rem' }}>
                  If left empty, all registered students can take the exam. You can copy a list of roll numbers from Notepad and paste them here directly.
                </small>
              </div>
            </div>

            {/* Right Column: Database Schema */}
            <div className="col-lg-6">
              <div className="card glass-card p-4 h-100 shadow-sm border-0">
                <h5 className="fw-bold text-primary mb-4 pb-2 border-bottom">3. Database Table Structures</h5>
                <label className="form-label small fw-bold text-muted">Table Definitions & CREATE Statements (Optional)</label>
                <textarea 
                  className="form-control font-monospace flex-grow-1" rows="10" 
                  placeholder="e.g.&#10;CREATE TABLE employees (&#10;  id INT,&#10;  name VARCHAR(50),&#10;  salary DECIMAL(10,2)&#10;);"
                  value={databaseSchema}
                  onChange={e => setDatabaseSchema(e.target.value)}
                  style={{ fontSize: '0.82rem', lineHeight: '1.4' }}
                />
                <small className="text-muted d-block mt-2" style={{ fontSize: '0.72rem' }}>
                  Provides CREATE TABLE schemas to help students understand the database layout during the exam.
                </small>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="col-12 d-flex justify-content-between mt-3">
              <button 
                type="button" className="btn btn-outline-secondary px-4 py-2"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
              <button 
                type="button" className="btn btn-primary px-4 py-2"
                onClick={() => validateStep2() && setStep(3)}
              >
                Next: Questions Pool →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Questions Pool */}
        {step === 3 && (
          <div className="row g-4 animate-fade">
            {/* Custom Question Form */}
            <div className="col-lg-4">
              <div className="card glass-card p-4 shadow-sm border-0">
                <h5 className="fw-bold text-success mb-3 pb-2 border-bottom">
                  {editingQuestionId ? '✏️ Edit Custom Question' : '➕ Add Custom Question'}
                </h5>
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
                    className="form-control form-control-sm" rows="3" placeholder="Describe the task..."
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
                    <label className="form-label small fw-bold">SQL Solution</label>
                    <input 
                      type="text" className="form-control form-control-sm" placeholder="e.g. SELECT * FROM emp;"
                      value={customSql} onChange={e => setCustomSql(e.target.value)}
                    />
                  </div>
                </div>
                <div className="d-flex gap-2">
                  {editingQuestionId ? (
                    <>
                      <button 
                        type="button" className="btn btn-sm btn-primary"
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
                        Save Changes
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
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button 
                      type="button" className="btn btn-sm btn-success w-100 d-flex align-items-center justify-content-center gap-1 py-2"
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
            </div>

            {/* Questions Pool */}
            <div className="col-lg-8">
              <div className="card glass-card p-4 shadow-sm border-0 h-100 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                  <h5 className="fw-bold text-primary mb-0">📁 Choose Questions from Shared Pool</h5>
                  <span className="badge bg-primary fs-7">{selectedQuestions.length} Selected</span>
                </div>
                <div className="flex-grow-1 pe-2 animate-fade" style={{ maxHeight: '480px', overflowY: 'auto', overflowX: 'hidden' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
                    gap: '16px',
                    padding: '4px'
                  }}>
                    {questions.map((q) => (
                      <div key={q.id} className={`question-pool-card cursor-pointer ${
                        selectedQuestions.includes(q.id) ? 'selected' : ''
                      }`} onClick={() => handleToggleQuestion(q.id)}>
                        <input 
                          type="checkbox" className="form-check-input mt-1" 
                          checked={selectedQuestions.includes(q.id)}
                          onChange={() => {}}
                        />
                        <div className="flex-grow-1 d-flex flex-column justify-content-between" style={{ minHeight: '150px' }}>
                          <div>
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <strong style={{ fontSize: '0.88rem' }}>{q.title}</strong>
                              <span className="badge bg-secondary small">{q.points} pts</span>
                            </div>
                            <p className="text-muted small mb-2" style={{ fontSize: '0.78rem', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {q.description}
                            </p>
                            <div className="bg-light p-2 rounded font-monospace small mb-2" style={{ fontSize: '0.72rem', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                              Solution: {q.sql_template}
                            </div>
                          </div>
                          <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                            <span className="badge bg-light text-dark border small" style={{ fontSize: '0.7rem' }}>{q.subject_name}</span>
                            <div className="btn-group btn-group-sm" onClick={e => e.stopPropagation()}>
                              <button 
                                type="button" className="btn btn-link text-primary p-0 px-2 fw-semibold"
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
                                type="button" className="btn btn-link text-danger p-0 px-2 fw-semibold"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Are you sure you want to delete this question?')) {
                                    try {
                                      await axios.delete(`${API_BASE}/api/shared/questions/${q.id}`);
                                      alert('Question deleted!');
                                      const r = await axios.get(`${API_BASE}/api/shared/questions`);
                                      setQuestions(r.data);
                                      setSelectedQuestions(prev => prev.filter(id => id !== q.id));
                                    } catch (err) {
                                      alert('Error deleting question.');
                                    }
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="col-12 d-flex justify-content-between mt-3">
              <button 
                type="button" className="btn btn-outline-secondary px-4 py-2"
                onClick={() => setStep(2)}
              >
                ← Back
              </button>
              <button 
                type="submit" className="btn btn-success px-5 py-2 shadow d-flex align-items-center gap-2"
              >
                <FaSave /> Save Changes
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default EditExam;
