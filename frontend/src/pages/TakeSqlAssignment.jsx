import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import API_BASE from '../config/api';
import alasql from 'alasql';
// Configure alaSQL for MS SQL functionality defaults
alasql.options.casesensitive = false;
alasql.options.tsql = true;

import { validateSqlQuery } from '../utils/sqlValidator';

import { 
  FaDatabase, FaPlay, FaSave, FaCheck, FaExclamationTriangle, 
  FaInfoCircle, FaArrowLeft, FaArrowRight, FaTable, FaLightbulb 
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

window.alasql = alasql;

const TakeSqlAssignment = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [database, setDatabase] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Selection
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [answers, setAnswers] = useState([]); // indices mapping to queries

  // Editor states
  const [activeQuery, setActiveQuery] = useState('');
  const [runResult, setRunResult] = useState(null);
  const [runError, setRunError] = useState('');

  // Status
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showTablePreview, setShowTablePreview] = useState(null); // Table object to preview

  const autoSaveTimerRef = useRef(null);

  // Initialize AlaSQL database reference name
  const [localDbId] = useState('take_db_' + Math.random().toString(36).substring(2, 9));

  const { darkMode } = useAuth();

  const answersRef = useRef([]);
  const submissionRef = useRef(null);
  const activeQueryRef = useRef('');
  const activeQIdxRef = useRef(0);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    submissionRef.current = submission;
  }, [submission]);

  useEffect(() => {
    activeQueryRef.current = activeQuery;
  }, [activeQuery]);

  useEffect(() => {
    activeQIdxRef.current = activeQIdx;
  }, [activeQIdx]);

  useEffect(() => {
    fetchAssignmentDetails();

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
      // Drop local AlaSQL db
      try {
        if (window.alasql) {
          window.alasql(`DROP DATABASE ${localDbId}`);
        }
      } catch (e) {}
    };
  }, [assignmentId]);

  // Load query for the active question when indices change
  useEffect(() => {
    if (answers.length > 0) {
      const activeAns = answers.find(a => a.question_idx === activeQIdx);
      setActiveQuery(activeAns ? activeAns.submitted_query : '');
      setRunResult(null);
      setRunError('');
      setShowHint(false);
    }
  }, [activeQIdx, answers]);

  const fetchAssignmentDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE}/api/sql-practice/student/assignments/${assignmentId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (res.data.max_attempts_reached) {
        setErrorMsg('You have already exhausted the maximum allowed attempts for this assignment.');
        setLoading(false);
        return;
      }

      setAssignment(res.data.assignment);
      setDatabase(res.data.database);
      setSubmission(res.data.submission);
      
      const savedAnswers = res.data.submission?.answers || [];
      const initializedAnswers = res.data.assignment.questions.map((q, idx) => {
        const existing = savedAnswers.find(sa => sa.question_idx === idx);
        return {
          question_idx: idx,
          submitted_query: existing ? existing.submitted_query : '',
          is_correct: false,
          auto_marks: 0,
          manual_marks: null,
          feedback: ''
        };
      });

      setAnswers(initializedAnswers);
      if (initializedAnswers.length > 0) {
        setActiveQuery(initializedAnswers[0].submitted_query);
      }

      // Initialize local AlaSQL schema
      initLocalDatabase(res.data.database);

      // Start Auto-Save Interval (every 25 seconds)
      autoSaveTimerRef.current = setInterval(() => {
        triggerAutoSave();
      }, 25000);

    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load SQL Assignment Details.');
    } finally {
      setLoading(false);
    }
  };

  const initLocalDatabase = (dbObj) => {
    try {
      window.alasql(`CREATE DATABASE IF NOT EXISTS ${localDbId}; USE ${localDbId};`);
      for (const t of dbObj.tables) {
        const cols = t.columns.map(c => `[${c.name}] ${c.type}`).join(', ');
        window.alasql(`CREATE TABLE IF NOT EXISTS [${t.name}] (${cols});`);
        if (t.rows && t.rows.length > 0) {
          window.alasql(`INSERT INTO [${t.name}] SELECT * FROM ?`, [t.rows]);
        }
      }
    } catch (e) {
      console.error('Local database setup failed:', e);
    }
  };

  // Sync current query field into the answers list state
  const handleQueryChangeLocal = (e) => {
    const qVal = e.target.value;
    setActiveQuery(qVal);
    setAnswers(prev => prev.map(ans => 
      ans.question_idx === activeQIdx ? { ...ans, submitted_query: qVal } : ans
    ));
  };

  // Execute the query locally inside student's sandbox
  const handleRunQuery = () => {
    setRunResult(null);
    setRunError('');

    if (!activeQuery.trim()) {
      setRunError('Syntax Error: Please write a SQL query to execute.');
      return;
    }

    try {
      validateSqlQuery(activeQuery);
      window.alasql(`USE ${localDbId};`);
      const res = window.alasql(activeQuery);
      setRunResult(res);
    } catch (err) {
      setRunError(err.message || 'SQL Execution Error');
    }
  };

  const triggerAutoSave = async (silent = true) => {
    if (!silent) setSaving(true);
    setSaveSuccess(false);

    const currentSubmission = submissionRef.current;
    if (!currentSubmission) {
      if (!silent) setSaving(false);
      return;
    }

    const currentAnswers = answersRef.current;
    const currentActiveQuery = activeQueryRef.current;
    const currentActiveQIdx = activeQIdxRef.current;

    // Use current references to avoid stale closures
    const latestAnswers = currentAnswers.map(ans => 
      ans.question_idx === currentActiveQIdx ? { ...ans, submitted_query: currentActiveQuery } : ans
    );

    try {
      await axios.post(
        `${API_BASE}/api/sql-practice/submissions/save-draft`,
        { submissionId: currentSubmission._id, answers: latestAnswers },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (!silent) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Draft auto-save failed:', err);
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const handleSubmitAssignment = async () => {
    const currentSubmission = submissionRef.current;
    if (!currentSubmission) return;

    setSaving(true);
    setErrorMsg('');

    const currentAnswers = answersRef.current;
    const currentActiveQuery = activeQueryRef.current;
    const currentActiveQIdx = activeQIdxRef.current;

    const latestAnswers = currentAnswers.map(ans => 
      ans.question_idx === currentActiveQIdx ? { ...ans, submitted_query: currentActiveQuery } : ans
    );

    try {
      await axios.post(
        `${API_BASE}/api/sql-practice/submissions/submit`,
        { submissionId: currentSubmission._id, answers: latestAnswers },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      navigate('/student/sql-submissions');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to submit assignment.');
    } finally {
      setSaving(false);
      setShowConfirmSubmit(false);
    }
  };

  if (loading) {
    return (
      <div className={`d-flex align-items-center justify-content-center min-vh-100 ${darkMode ? 'bg-dark text-white' : 'bg-light text-dark'}`}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" />
          <p className="text-muted">Initializing SQL Practice sandbox & database structures...</p>
        </div>
      </div>
    );
  }

  if (errorMsg && !assignment) {
    return (
      <div className={`container py-5 ${darkMode ? 'text-white' : 'text-dark'}`}>
        <div className="alert alert-danger d-flex align-items-center gap-2">
          <FaExclamationTriangle />
          <span>{errorMsg}</span>
        </div>
        <button className={`btn ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`} onClick={() => navigate('/student/sql-assignments')}>
          Back to List
        </button>
      </div>
    );
  }

  const activeQuestion = assignment.questions[activeQIdx];

  return (
    <div className={`container-fluid min-vh-100 p-0 ${darkMode ? 'bg-dark bg-opacity-95 text-white' : 'bg-light text-dark'}`} style={{ marginTop: '-24px' }}>
      
      {/* Header Bar */}
      <div className={`d-flex justify-content-between align-items-center px-4 py-3 border-bottom ${
        darkMode ? 'bg-black bg-opacity-40 border-secondary border-opacity-20' : 'bg-white border-light shadow-sm'
      }`}>
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={() => navigate('/student/sql-assignments')}>
            <FaArrowLeft /> Back
          </button>
          <div>
            <h4 className="fw-bold mb-0 text-info">{assignment.title}</h4>
            <span className="text-muted small">Database Schema: {database.name}</span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          {saveSuccess && <span className="text-success small d-flex align-items-center gap-1"><FaCheck /> Draft Auto-Saved</span>}
          <button className="btn btn-outline-warning btn-sm d-flex align-items-center gap-2" onClick={() => triggerAutoSave(false)} disabled={saving}>
            <FaSave /> {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button className="btn btn-success btn-sm fw-bold px-3" onClick={() => setShowConfirmSubmit(true)}>
            Finish & Submit
          </button>
        </div>
      </div>

      <div className="row g-0" style={{ minHeight: 'calc(100vh - 66px)' }}>
        
        {/* Left Side: Question, Schema & Accordion */}
        <div className={`col-lg-5 p-4 d-flex flex-column justify-content-between border-end ${
          darkMode ? 'border-secondary border-opacity-20' : 'border-light'
        }`} style={{ maxHeight: 'calc(100vh - 66px)', overflowY: 'auto' }}>
          <div>
            {/* Navigation Cards */}
            <div className={`d-flex gap-2 overflow-x-auto pb-3 mb-4 border-bottom ${
              darkMode ? 'border-secondary border-opacity-10' : 'border-light'
            }`}>
              {assignment.questions.map((q, idx) => {
                const ansObj = answers.find(a => a.question_idx === idx);
                const hasAnswer = ansObj && ansObj.submitted_query.trim().length > 0;
                
                return (
                  <button 
                    key={idx}
                    className={`btn btn-xs fw-bold px-3 py-2 text-nowrap flex-grow-1 ${
                      idx === activeQIdx 
                        ? 'btn-primary' 
                        : hasAnswer 
                          ? 'btn-outline-info' 
                          : 'btn-outline-secondary'
                    }`}
                    onClick={() => setActiveQIdx(idx)}
                  >
                    Task {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Current Question Block */}
            <div className="card glass-card p-3 mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="badge bg-secondary">Task #{activeQIdx + 1} ({activeQuestion.points} Marks)</span>
                <span className={`badge ${
                  activeQuestion.difficulty === 'Easy' ? 'bg-success' : activeQuestion.difficulty === 'Medium' ? 'bg-warning text-dark' : 'bg-danger'
                }`}>{activeQuestion.difficulty}</span>
              </div>
              <h5 className={`fw-semibold mb-3 ${darkMode ? 'text-white' : 'text-dark'}`} style={{ lineHeight: '1.45' }}>{activeQuestion.question_text}</h5>
              
              {activeQuestion.hints && (
                <div>
                  <button className="btn btn-xs btn-link text-info p-0 d-flex align-items-center gap-1 small text-decoration-none" onClick={() => setShowHint(!showHint)}>
                    <FaLightbulb /> {showHint ? 'Hide Hint' : 'Show Hint'}
                  </button>
                  {showHint && (
                    <div className="alert alert-info py-2 px-3 mt-2 small mb-0 border border-info border-opacity-20 bg-info bg-opacity-10 text-info">
                      {activeQuestion.hints}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Database Tables Explorer */}
            <div>
              <h6 className="fw-bold text-muted small text-uppercase mb-3 d-flex align-items-center gap-2">
                <FaDatabase className="text-info" /> Relational Schema
              </h6>

              {database.tables.map((table, tIdx) => (
                <div key={tIdx} className={`card p-3 mb-3 border rounded ${
                  darkMode ? 'bg-black bg-opacity-30 border-secondary border-opacity-10' : 'bg-white border-light shadow-sm'
                }`}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold text-info font-monospace">{table.name}</span>
                    <button className="btn btn-xs btn-outline-secondary py-0 px-2 small font-monospace" onClick={() => setShowTablePreview(table)}>
                      [Preview Rows]
                    </button>
                  </div>
                  
                  <div className="small font-monospace text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                    {table.columns.map((c, cIdx) => (
                      <div key={cIdx} className={`d-flex justify-content-between py-1 border-bottom ${
                        darkMode ? 'border-secondary border-opacity-5' : 'border-light'
                      }`}>
                        <span>
                          {c.name} {c.is_primary && <span className="text-warning small">*PK</span>}
                          {c.is_foreign && <span className="text-info small fs-xs"> *FK</span>}
                        </span>
                        <span>{c.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`d-flex justify-content-between border-top pt-3 mt-4 ${
            darkMode ? 'border-secondary border-opacity-10' : 'border-light'
          }`}>
            <button 
              className="btn btn-outline-secondary d-flex align-items-center gap-1"
              disabled={activeQIdx === 0}
              onClick={() => setActiveQIdx(activeQIdx - 1)}
            >
              <FaArrowLeft size={12} /> Previous Question
            </button>
            <button 
              className="btn btn-outline-primary d-flex align-items-center gap-1"
              disabled={activeQIdx === assignment.questions.length - 1}
              onClick={() => setActiveQIdx(activeQIdx + 1)}
            >
              Next Question <FaArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Right Side: SQL Query Workspace */}
        <div className="col-lg-7 d-flex flex-column" style={{ maxHeight: 'calc(100vh - 66px)' }}>
          {/* Query input panel */}
          <div className={`p-4 border-bottom d-flex flex-column h-50 ${
            darkMode ? 'border-secondary border-opacity-20' : 'border-light'
          }`}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-bold text-uppercase d-flex align-items-center gap-2">Write Query Sandbox</span>
              <button className="btn btn-primary btn-sm d-flex align-items-center gap-2 px-3 fw-bold" onClick={handleRunQuery}>
                <FaPlay size={10} /> Run Query
              </button>
            </div>
            
            <textarea 
              className={`form-control flex-grow-1 font-monospace p-3 rounded ${
                darkMode 
                  ? 'bg-black bg-opacity-60 border-secondary border-opacity-35 text-white' 
                  : 'bg-white border-secondary border-opacity-30 text-dark shadow-sm'
              }`}
              style={{ fontSize: '0.85rem', resize: 'none', lineHeight: '1.5' }}
              value={activeQuery}
              onChange={handleQueryChangeLocal}
              placeholder="SELECT * FROM table_name;"
            />
          </div>

          {/* Results grid panel */}
          <div className={`p-4 flex-grow-1 ${
            darkMode ? 'bg-dark bg-opacity-70' : 'bg-light bg-opacity-90'
          }`} style={{ overflowY: 'auto', maxHeight: '50%' }}>
            <span className="text-muted small fw-bold text-uppercase d-block mb-3">Query output / Results</span>
            
            {runError && (
              <div className="alert alert-danger py-2 px-3 font-monospace small mb-0 border border-danger border-opacity-20">
                {runError}
              </div>
            )}

            {runResult && (
              <div>
                {Array.isArray(runResult) ? (
                  runResult.length === 0 ? (
                    <div className="alert alert-info py-2 px-3 font-monospace small mb-0">
                      Query executed successfully. Returned 0 rows.
                    </div>
                  ) : (
                    <div>
                      <div className="text-muted small mb-2 font-monospace">Rows returned: {runResult.length}</div>
                      <div className={`table-responsive rounded border ${
                        darkMode ? 'border-secondary border-opacity-20' : 'border-light'
                      }`}>
                        <table className="table table-sm font-monospace small align-middle mb-0">
                          <thead>
                            <tr className="table-secondary bg-opacity-25 header-dark">
                              {Object.keys(runResult[0]).map((key, idx) => (
                                <th key={idx}>{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {runResult.map((row, rIdx) => (
                              <tr key={rIdx}>
                                {Object.values(row).map((val, vIdx) => (
                                  <td key={vIdx}>
                                    {val === null || val === undefined ? <span className="text-muted small">[NULL]</span> : String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="alert alert-success py-2 px-3 font-monospace small mb-0">
                    Query completed. Result: {JSON.stringify(runResult)}
                  </div>
                )}
              </div>
            )}

            {!runResult && !runError && (
              <div className="text-center text-muted py-5">
                <FaInfoCircle className="fs-3 mb-2" />
                <p className="mb-0 small">Write your SELECT query and click "Run Query" to preview results from the sandbox database.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row preview modal */}
      {showTablePreview && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className={`modal-content rounded-3 shadow-lg ${
              darkMode ? 'bg-dark border border-secondary text-white' : 'bg-white text-dark'
            }`}>
              <div className={`modal-header ${darkMode ? 'border-secondary' : 'border-light'}`}>
                <h5 className="modal-title text-info fw-bold d-flex align-items-center gap-2">
                  <FaTable /> Table Records: {showTablePreview.name}
                </h5>
                <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} onClick={() => setShowTablePreview(null)} />
              </div>
              <div className="modal-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                {showTablePreview.rows && showTablePreview.rows.length > 0 ? (
                  <div className={`table-responsive rounded border ${
                    darkMode ? 'border-secondary border-opacity-10' : 'border-light'
                  }`}>
                    <table className="table table-sm align-middle small font-monospace mb-0">
                      <thead>
                        <tr className="table-secondary bg-opacity-20">
                          {Object.keys(showTablePreview.rows[0]).map((k, idx) => (
                            <th key={idx}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {showTablePreview.rows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {Object.values(row).map((val, vIdx) => (
                              <td key={vIdx}>{val === null || val === undefined ? 'NULL' : String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-muted text-center py-4">No rows defined in this table schema.</div>
                )}
              </div>
              <div className={`modal-footer ${darkMode ? 'border-secondary' : 'border-light'}`}>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowTablePreview(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submitting check modal */}
      {showConfirmSubmit && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className={`modal-content rounded-3 shadow ${
              darkMode ? 'bg-dark border border-secondary text-white' : 'bg-white text-dark'
            }`}>
              <div className={`modal-header ${darkMode ? 'border-secondary' : 'border-light'}`}>
                <h5 className="modal-title text-warning fw-bold">Submit Assignment</h5>
                <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} onClick={() => setShowConfirmSubmit(false)} />
              </div>
              <div className="modal-body text-center p-4">
                <p>Are you sure you want to finish and finalize your submission for this assignment?</p>
                <div className="alert alert-info py-2 px-3 small border border-info border-opacity-15 mb-0">
                  You have written queries for{' '}
                  <strong>{answers.filter(a => a.submitted_query.trim().length > 0).length}</strong>{' '}
                  out of <strong>{assignment.questions.length}</strong> tasks. Once submitted, your score will be computed.
                </div>
              </div>
              <div className={`modal-footer justify-content-center ${darkMode ? 'border-secondary' : 'border-light'}`}>
                <button type="button" className="btn btn-success px-4 fw-bold" onClick={handleSubmitAssignment} disabled={saving}>
                  {saving ? 'Submitting...' : 'Yes, Submit Now'}
                </button>
                <button type="button" className="btn btn-outline-secondary px-4" onClick={() => setShowConfirmSubmit(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeSqlAssignment;
