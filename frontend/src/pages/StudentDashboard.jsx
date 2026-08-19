import API_BASE from '../config/api.js';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaPlay, FaCheckCircle, FaExclamationCircle, FaLock } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const { cachedExams, setCachedExams } = useAuth();
  const exams = cachedExams || [];
  const [loading, setLoading] = useState(exams.length === 0);
  const navigate = useNavigate();

  // Custom Modal States
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [accessCode, setAccessCode] = useState('');
  const [accessError, setAccessError] = useState('');

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/student/exams`);
        setCachedExams(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  const enterFS = async () => {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen request failed:", err);
    }
  };

  const handleStartExam = async (exam) => {
    if (exam.access_code) {
      setSelectedExam(exam);
      setAccessCode('');
      setAccessError('');
      setShowAccessModal(true);
    } else {
      await enterFS();
      navigate(`/student/exams/${exam.id}`);
    }
  };

  const handleAccessSubmit = async (e) => {
    e.preventDefault();
    if (!accessCode) {
      setAccessError('Passcode is required.');
      return;
    }
    if (accessCode !== selectedExam.access_code) {
      setAccessError('Incorrect passcode. Access denied.');
      return;
    }
    setShowAccessModal(false);
    await enterFS();
    navigate(`/student/exams/${selectedExam.id}?code=${accessCode}`);
  };

  if (loading) return <div className="container mt-4"><div className="skeleton-line" /></div>;

  return (
    <div className="container mt-4 animated-fade">
      <h3 className="fw-bold mb-4">Active & Available Exams</h3>

      <div className="row">
        {exams.map((exam) => (
          <div key={exam.id} className="col-lg-6 col-12 mb-4">
            <div className="card glass-card p-4 h-100 d-flex flex-column">
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2 mb-2">
                <span className="badge bg-secondary text-wrap" style={{ maxWidth: '100%' }}>{exam.subject_name}</span>
                <div className="d-flex gap-1 flex-wrap">
                  {(!exam.submission_status || exam.submission_status === 'Draft') && (
                    <span className="badge bg-danger text-wrap">Absent</span>
                  )}
                  {exam.access_code && (
                    <span className="badge bg-danger d-flex align-items-center gap-1 text-wrap">
                      <FaLock size={10} /> Secure Code Req.
                    </span>
                  )}
                </div>
              </div>
              <h5 className="fw-bold">{exam.title}</h5>
              <p className="text-muted small flex-grow-1">{exam.description}</p>
              
              <div className="row text-center mb-3">
                <div className="col-6 border-end">
                  <div className="text-muted small">Marks</div>
                  <div className="fw-bold">{exam.total_marks}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted small">Duration</div>
                  <div className="fw-bold">{exam.duration_minutes} Mins</div>
                </div>
              </div>

              {(exam.start_time || exam.end_time) && (
                <div className="p-2 bg-light rounded text-center small mb-3">
                  <div className="fw-bold text-primary mb-1">Access Timeline Window:</div>
                  <div className="d-flex flex-column flex-sm-row justify-content-center align-items-center gap-1 text-muted">
                    <span><strong>Start:</strong> {exam.start_time ? new Date(exam.start_time).toLocaleString() : 'Open'}</span>
                    <span className="d-none d-sm-inline mx-1">•</span>
                    <span><strong>End:</strong> {exam.end_time ? new Date(exam.end_time).toLocaleString() : 'Expiry Closed'}</span>
                  </div>
                </div>
              )}

              {exam.submission_status === 'Submitted' || exam.submission_status === 'Graded' ? (
                <button 
                  onClick={() => navigate(`/student/exams/${exam.id}`)}
                  className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2"
                >
                  <FaCheckCircle /> View Submission
                </button>
              ) : (
                <button 
                  onClick={() => handleStartExam(exam)} 
                  className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                >
                  <FaPlay /> {exam.submission_status === 'Draft' ? 'Resume Exam' : 'Start Exam'}
                </button>
              )}
            </div>
          </div>
        ))}
        {exams.length === 0 && (
          <div className="col-12 text-center py-5 text-muted">
            <FaExclamationCircle className="fs-1 mb-2 text-warning" />
            <p>No exams are currently active. Check back later.</p>
          </div>
        )}
      </div>

      {showAccessModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-card p-4 shadow-lg border-danger" style={{ borderRadius: '16px' }}>
              <div className="modal-header border-0 pb-0 d-flex justify-content-between align-items-center">
                <h5 className="modal-title fw-bold text-danger d-flex align-items-center gap-2">
                  <FaLock className="text-danger animate-pulse" /> Secure Exam Access
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAccessModal(false)}></button>
              </div>
              <form onSubmit={handleAccessSubmit}>
                <div className="modal-body pt-3">
                  <p className="text-muted small mb-3">
                    This exam is password-protected. Please enter the passcode provided by your instructor to begin.
                  </p>
                  
                  <div className="mb-2">
                    <input
                      type="password"
                      className={`form-control ${accessError ? 'is-invalid' : ''}`}
                      placeholder="Enter Access Passcode"
                      value={accessCode}
                      onChange={(e) => {
                        setAccessCode(e.target.value);
                        if (accessError) setAccessError('');
                      }}
                      autoFocus
                      required
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        letterSpacing: '2px',
                        textAlign: 'center',
                        fontSize: '1.1rem',
                        fontWeight: '600'
                      }}
                    />
                    {accessError && (
                      <div className="invalid-feedback text-center mt-2 fw-medium">
                        {accessError}
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0 d-flex justify-content-end gap-2">
                  <button 
                    type="button" 
                    className="btn btn-secondary px-4" 
                    onClick={() => setShowAccessModal(false)}
                    style={{ borderRadius: '8px' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-danger px-4 d-flex align-items-center gap-2"
                    style={{ borderRadius: '8px' }}
                  >
                    Start Exam
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;


