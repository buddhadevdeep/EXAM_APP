import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_BASE from '../config/api';
import { 
  FaClipboardList, FaPlay, FaRegClock, FaDatabase, 
  FaFileInvoice, FaCheckCircle, FaExclamationCircle 
} from 'react-icons/fa';

const StudentSqlAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/sql-practice/student/assignments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAssignments(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load your SQL Assignments.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = (assignId) => {
    navigate(`/student/sql-assignments/take/${assignId}`);
  };

  const cleanTime = (dateStr) => {
    if (!dateStr) return 'No deadline';
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h2 className="fw-bold mb-1 text-primary d-flex align-items-center gap-2">
          <FaClipboardList /> My SQL Assignments
        </h2>
        <p className="text-muted">Interactive SQL practice assignments scheduled for your class section.</p>
      </div>

      {errorMsg && <div className="alert alert-danger py-2">{errorMsg}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="card glass-card p-5 text-center text-muted border border-secondary border-opacity-10">
          <FaClipboardList className="fs-1 mb-3 text-warning" />
          <p className="mb-0">No SQL Assignments found for your section. Check back later!</p>
        </div>
      ) : (
        <div className="row g-4">
          {assignments.map(a => {
            const now = new Date();
            const start = a.start_time ? new Date(a.start_time) : null;
            const end = a.end_time ? new Date(a.end_time) : null;

            const isNotStarted = start && start > now;
            const isExpired = end && end < now;
            const isMaxAttempts = a.total_attempts >= a.max_attempts;

            let statusBadge = <span className="badge bg-success">Active</span>;
            let canTake = true;
            let actionBtnText = 'Start Assignment';

            if (isNotStarted) {
              statusBadge = <span className="badge bg-warning text-dark">Scheduled</span>;
              canTake = false;
              actionBtnText = 'Not Started';
            } else if (isExpired) {
              statusBadge = <span className="badge bg-danger">Expired</span>;
              canTake = false;
              actionBtnText = 'Deadline Passed';
            } else if (isMaxAttempts) {
              statusBadge = <span className="badge bg-secondary">Completed</span>;
              canTake = false;
              actionBtnText = 'Attempts Exhausted';
            } else if (a.has_draft) {
              actionBtnText = 'Resume Draft';
            }

            const totalPoints = a.questions.reduce((sum, q) => sum + q.points, 0);

            return (
              <div key={a._id} className="col-md-6 col-lg-4">
                <div className="card glass-card h-100 p-4 border border-secondary border-opacity-10 shadow d-flex flex-column justify-content-between hover-pulse">
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <span className="text-muted small fw-bold text-uppercase">SQL Assignment</span>
                      {statusBadge}
                    </div>

                    <h4 className="fw-bold mb-2 text-info">{a.title}</h4>
                    <p className="text-muted small mb-4">{a.description || 'No instruction details provided.'}</p>

                    <div className="border-top border-secondary border-opacity-15 pt-3 mb-4 small">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <FaDatabase className="text-info" size={14} />
                        <span>Database: <strong>{a.database_name}</strong></span>
                      </div>
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <FaFileInvoice className="text-info" size={14} />
                        <span>{a.questions.length} Questions ({totalPoints} Total Marks)</span>
                      </div>
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <FaRegClock className="text-info" size={14} />
                        <span>Deadline: <strong className="text-warning">{cleanTime(a.end_time)}</strong></span>
                      </div>
                      <div className="d-flex align-items-center gap-2 text-muted">
                        {isMaxAttempts ? (
                          <FaCheckCircle className="text-success" size={14} />
                        ) : (
                          <FaExclamationCircle className="text-warning" size={14} />
                        )}
                        <span>Attempts: {a.total_attempts} / {a.max_attempts === 999 ? 'Unlimited' : a.max_attempts}</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    className={`btn w-100 fw-bold py-2 ${
                      a.has_draft ? 'btn-warning text-dark' : canTake ? 'btn-primary' : 'btn-outline-secondary'
                    }`}
                    disabled={!canTake}
                    onClick={() => handleStart(a._id)}
                  >
                    {canTake && !a.has_draft && <FaPlay size={12} className="me-2" />}
                    {actionBtnText}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentSqlAssignments;
