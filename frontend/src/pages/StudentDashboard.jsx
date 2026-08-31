import API_BASE from '../config/api.js';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaPlay, FaCheckCircle, FaExclamationCircle, FaLock, FaDatabase } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const { cachedExams, setCachedExams } = useAuth();
  const exams = cachedExams || [];
  const [sqlAssignments, setSqlAssignments] = useState([]);
  const [loading, setLoading] = useState(exams.length === 0);
  const [activeTab, setActiveTab] = useState('exams'); // 'exams' | 'assignments'
  const navigate = useNavigate();

  // Custom Modal States
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [accessCode, setAccessCode] = useState('');
  const [accessError, setAccessError] = useState('');

  const proctoredExams = exams.filter(e => e.exam_type !== 'Assignment');
  const now = new Date();
  const practiceAssignments = [
    ...exams.filter(e => e.exam_type === 'Assignment'),
    ...sqlAssignments.map(a => {
      const submittedSubs = a.submissions?.filter(s => s.status !== 'Draft') || [];
      const latestSub = submittedSubs[submittedSubs.length - 1];
      return {
        id: a._id,
        _id: a._id,
        title: a.title,
        description: a.description,
        subject_name: `SQL (${a.database_name})`,
        exam_type: 'Assignment',
        isSql: true,
        total_marks: a.questions.reduce((sum, q) => sum + q.points, 0),
        duration_minutes: 'Self-Paced',
        submission_status: a.total_attempts >= a.max_attempts ? 'Submitted' : (a.has_draft ? 'Draft' : 'Not Started'),
        max_attempts: a.max_attempts,
        total_attempts: a.total_attempts,
        start_time: a.start_time,
        end_time: a.end_time,
        submission_id: latestSub ? latestSub._id : null
      };
    })
  ].filter(exam => {
    // Filter out assignments whose deadline has passed
    if (exam.end_time && new Date(exam.end_time) < now) {
      return false;
    }
    return true;
  });

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
    const fetchSqlAssignments = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/sql-practice/student/assignments`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSqlAssignments(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchExams();
    fetchSqlAssignments();
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
    if (exam.isSql) {
      navigate(`/student/sql-assignments/take/${exam.id}`);
    } else if (exam.exam_type === 'Assignment') {
      navigate(`/student/exams/${exam.id}`);
    } else if (exam.access_code) {
      setSelectedExam(exam);
      setAccessCode('');
      setAccessError('');
      setShowAccessModal(true);
    } else {
      await enterFS();
      navigate(`/student/exams/${exam.id}`);
    }
  };

  const handleViewSubmission = (exam) => {
    if (exam.isSql) {
      navigate(`/student/sql-submissions/${exam.submission_id}`);
    } else {
      navigate(`/student/exams/${exam.id}?submissionId=${exam.submission_id}`);
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

  const activeList = activeTab === 'exams' ? proctoredExams : practiceAssignments;

  return (
    <div className="container mt-4 animated-fade">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold mb-1 mb-md-0 text-gradient text-gradient-info text-uppercase">Student Dashboard</h3>
          <p className="text-muted small mb-0">Access your proctored exams and homework assignments</p>
        </div>
      </div>

      <ul className="nav nav-pills gap-2 mb-4 bg-dark bg-opacity-25 p-2 rounded-3 border border-secondary border-opacity-10 d-inline-flex">
        <li className="nav-item">
          <button 
            type="button"
            className={`nav-link fw-bold px-4 py-2 border-0 rounded-2 transition-all d-flex align-items-center gap-2 ${activeTab === 'exams' ? 'active bg-primary text-white shadow-sm' : 'bg-transparent text-muted'}`}
            onClick={() => setActiveTab('exams')}
          >
            📝 Proctored Exams <span className={`badge ${activeTab === 'exams' ? 'bg-white text-primary' : 'bg-secondary bg-opacity-25 text-muted'}`}>{proctoredExams.length}</span>
          </button>
        </li>
        <li className="nav-item">
          <button 
            type="button"
            className={`nav-link fw-bold px-4 py-2 border-0 rounded-2 transition-all d-flex align-items-center gap-2 ${activeTab === 'assignments' ? 'active bg-info text-dark shadow-sm' : 'bg-transparent text-muted'}`}
            onClick={() => setActiveTab('assignments')}
          >
            📋 Assignments <span className={`badge ${activeTab === 'assignments' ? 'bg-dark text-info' : 'bg-secondary bg-opacity-25 text-muted'}`}>{practiceAssignments.length}</span>
          </button>
        </li>
      </ul>

      <div className="row">
        {activeList.map((exam) => (
          <div key={exam.id} className="col-lg-6 col-12 mb-4">
            <div className="card glass-card p-4 h-100 d-flex flex-column border border-secondary border-opacity-15 shadow-sm">
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2 mb-2">
                <span className="badge bg-secondary text-wrap" style={{ maxWidth: '100%' }}>{exam.subject_name}</span>
                <div className="d-flex gap-1 flex-wrap">
                  {exam.exam_type !== 'Assignment' ? (
                    <>
                      {(!exam.submission_status || exam.submission_status === 'Draft') && (
                        <span className="badge bg-danger text-wrap">Absent</span>
                      )}
                      {exam.access_code && (
                        <span className="badge bg-danger d-flex align-items-center gap-1 text-wrap">
                          <FaLock size={10} /> Secure Code Req.
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="badge bg-info text-dark text-wrap fw-bold">Assignment</span>
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
                  <div className="fw-bold">{exam.duration_minutes === 'Self-Paced' ? 'Self-Paced' : `${exam.duration_minutes} Mins`}</div>
                </div>
              </div>

              {(exam.start_time || exam.end_time) && exam.exam_type !== 'Assignment' && (
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
                  onClick={() => handleViewSubmission(exam)}
                  className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2 animate-hover"
                >
                  <FaCheckCircle /> View Submission
                </button>
              ) : (
                <button 
                  onClick={() => handleStartExam(exam)} 
                  className={exam.exam_type === 'Assignment' ? "btn btn-info w-100 d-flex align-items-center justify-content-center gap-2 animate-hover text-dark fw-bold" : "btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2 animate-hover"}
                >
                  <FaPlay /> {
                    exam.exam_type === 'Assignment' 
                      ? (exam.submission_status === 'Draft' ? 'Resume Assignment' : 'Start Assignment')
                      : (exam.submission_status === 'Draft' ? 'Resume Exam' : 'Start Exam')
                  }
                </button>
              )}
              

            </div>
          </div>
        ))}
        {activeList.length === 0 && (
          <div className="col-12 text-center py-5 text-muted">
            <FaExclamationCircle className="fs-1 mb-2 text-warning" />
            <p>{activeTab === 'exams' ? 'No exams' : 'No practice assignments'} are currently active. Check back later.</p>
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


