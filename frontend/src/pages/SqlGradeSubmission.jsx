import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import API_BASE from '../config/api';
import { FaGraduationCap, FaSave, FaCheckCircle, FaTimesCircle, FaArrowLeft, FaDatabase, FaAward } from 'react-icons/fa';

const SqlGradeSubmission = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [message, setMessage] = useState('');

  // Editing grade list states
  const [grades, setGrades] = useState([]); // Array of: { question_idx, manual_marks, feedback }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSubmissionDetail();
  }, [submissionId]);

  const fetchSubmissionDetail = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/sql-practice/submissions/review/${submissionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDetail(res.data);

      const savedAnswers = res.data.submission?.answers || [];
      const initGrades = res.data.assignment.questions.map((q, idx) => {
        const existing = savedAnswers.find(sa => sa.question_idx === idx) || {};
        return {
          question_idx: idx,
          manual_marks: existing.manual_marks !== null && existing.manual_marks !== undefined ? String(existing.manual_marks) : '',
          feedback: existing.feedback || ''
        };
      });
      setGrades(initGrades);

    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load submission details.');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (idx, field, val) => {
    setGrades(prev => prev.map(g => 
      g.question_idx === idx ? { ...g, [field]: val } : g
    ));
  };

  const handleSaveGrades = async (e) => {
    e.preventDefault();
    setMessage('');
    setErrorMsg('');
    setSaving(true);

    try {
      const answersPayload = grades.map(g => ({
        question_idx: g.question_idx,
        manual_marks: g.manual_marks.trim() !== '' ? Number(g.manual_marks) : null,
        feedback: g.feedback.trim()
      }));

      await axios.post(`${API_BASE}/api/sql-practice/submissions/review/${submissionId}`, {
        answers: answersPayload
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setMessage('Grades and feedback saved successfully!');
      fetchSubmissionDetail();
      setTimeout(() => navigate('/teacher/sql-grades'), 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to save grading updates.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (errorMsg || !detail) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger py-2">{errorMsg || 'Submission not found.'}</div>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/teacher/sql-grades')}>
          Back to list
        </button>
      </div>
    );
  }

  const { submission, assignment, database, student } = detail;
  const totalPossible = assignment.questions.reduce((sum, q) => sum + q.points, 0);
  const totalEarned = submission.answers.reduce((sum, a) => sum + (a.manual_marks !== null && a.manual_marks !== undefined ? a.manual_marks : 0), 0);

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <button className="btn btn-xs btn-outline-secondary d-flex align-items-center gap-1 mb-2" onClick={() => navigate('/teacher/sql-grades')}>
            <FaArrowLeft /> Back to Grades list
          </button>
          <h2 className="fw-bold mb-1 text-primary d-flex align-items-center gap-2">
            <FaGraduationCap /> Grade Attempt #{submission.attempt_number}
          </h2>
          <p className="text-muted mb-0">
            Student: <strong>{student ? student.full_name : 'Unknown'} (Roll: {student ? student.roll_number : 'N/A'})</strong> • {assignment.title}
          </p>
        </div>

        <div className="card glass-card px-4 py-2 border border-info border-opacity-35 text-end">
          <span className="text-muted small">Current Score</span>
          <h3 className="fw-bold text-success mb-0 d-flex align-items-center gap-2">
            <FaAward /> {totalEarned} / {totalPossible} Marks
          </h3>
        </div>
      </div>

      {message && <div className="alert alert-success py-2">{message}</div>}
      {errorMsg && <div className="alert alert-danger py-2">{errorMsg}</div>}

      <form onSubmit={handleSaveGrades}>
        <div className="row g-4">
          <div className="col-12 font-monospace">
            {assignment.questions.map((q, idx) => {
              const ansObj = submission.answers.find(a => a.question_idx === idx) || {};
              const gradeObj = grades.find(g => g.question_idx === idx) || { manual_marks: '', feedback: '' };
              const hasManualMarks = ansObj.manual_marks !== null && ansObj.manual_marks !== undefined;

              return (
                <div key={idx} className="card glass-card p-4 mb-4 border border-secondary border-opacity-15 rounded-3 shadow">
                  
                  {/* Task details */}
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-baseline gap-2 mb-3">
                    <h5 className="fw-bold text-info font-monospace mb-0">Task #{idx + 1}</h5>
                    <div className="d-flex gap-2">
                      {hasManualMarks ? (
                        <span className="badge bg-success d-flex align-items-center gap-1">
                          <FaCheckCircle /> Graded: {ansObj.manual_marks} / {q.points}
                        </span>
                      ) : (
                        <span className="badge bg-warning text-dark d-flex align-items-center gap-1">
                          <FaTimesCircle /> Pending Grading
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="question-text-box fs-6 mb-3">{q.question_text}</div>

                  <div className="row g-3">
                    {/* Student Solution VS Expected query */}
                    <div className="col-lg-7">
                      <div className="mb-3">
                        <span className="text-muted small fw-bold text-uppercase d-block mb-1">Student SQL Code:</span>
                        <pre className="code-preview">
                          {ansObj.submitted_query ? ansObj.submitted_query : '-- No query submitted --'}
                        </pre>
                      </div>

                      <div>
                        <span className="text-muted small fw-bold text-uppercase d-block mb-1 text-info">Reference SQL Answer:</span>
                        <pre className="code-preview-reference">
                          {q.expected_sql}
                        </pre>
                      </div>
                    </div>

                    {/* Grade Editor block */}
                    <div className="col-lg-5">
                      <div className="card glass-card p-3 h-100 d-flex flex-column justify-content-between">
                        <div>
                          <label className="form-label text-muted small fw-bold text-uppercase mb-1">Manual Grade Override</label>
                          <div className="d-flex align-items-center gap-2 mb-3">
                            <input 
                              type="number" 
                              className="form-control form-control-sm font-monospace"
                              style={{ maxWidth: '80px' }}
                              value={gradeObj.manual_marks}
                              onChange={(e) => handleGradeChange(idx, 'manual_marks', e.target.value)}
                              min="0"
                              max={q.points}
                              placeholder="0"
                            />
                            <span className="text-muted small">/ {q.points} max marks</span>
                          </div>

                          <label className="form-label text-muted small fw-bold text-uppercase mb-1">Query Feedback Comment</label>
                          <textarea 
                            className="form-control small" 
                            rows={3}
                            value={gradeObj.feedback}
                            onChange={(e) => handleGradeChange(idx, 'feedback', e.target.value)}
                            placeholder="Add tips/suggestions regarding query structure..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="d-flex justify-content-end gap-3 mt-4">
          <button type="submit" className="btn btn-success px-4 d-flex align-items-center gap-2 fw-bold shadow" disabled={saving}>
            <FaSave /> {saving ? 'Saving updates...' : 'Save & Publish Grades'}
          </button>
          <button type="button" className="btn btn-outline-secondary px-4 fw-bold" onClick={() => navigate('/teacher/sql-grades')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default SqlGradeSubmission;
