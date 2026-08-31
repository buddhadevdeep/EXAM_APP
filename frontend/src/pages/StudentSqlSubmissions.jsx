import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_BASE from '../config/api';
import { FaHistory, FaEye, FaAward, FaRegClock } from 'react-icons/fa';

const StudentSqlSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/sql-practice/student/submissions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSubmissions(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load SQL submission history.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h2 className="fw-bold mb-1 text-primary d-flex align-items-center gap-2">
          <FaHistory /> SQL Submissions & Results
        </h2>
        <p className="text-muted">Review grading status, scores, and teacher comments for completed custom database assignments.</p>
      </div>

      {errorMsg && <div className="alert alert-danger py-2">{errorMsg}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="card glass-card p-5 text-center text-muted border border-secondary border-opacity-10">
          <FaHistory className="fs-1 mb-3 text-warning" />
          <p className="mb-0">No submissions found. Take an active SQL Assignment to see history!</p>
        </div>
      ) : (
        <div className="card glass-card p-3 p-md-4">
          <div className="d-none d-md-block table-responsive">
            <table className="table align-middle mb-0 text-nowrap">
              <thead className="font-monospace text-uppercase" style={{ fontSize: '0.8rem' }}>
                <tr>
                  <th>Assignment</th>
                  <th>Attempt</th>
                  <th>Submitted On</th>
                  <th>Status</th>
                  <th>Marks Earned</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => {
                  const isNotSubmitted = sub.status === 'Not Submitted';
                  const earnedPoints = isNotSubmitted ? 0 : sub.final_marks;
                  
                  return (
                    <tr key={sub._id} className="border-bottom border-secondary border-opacity-10">
                      <td>
                        <div className="fw-bold text-info">{sub.assignment_title}</div>
                        {!isNotSubmitted && <span className="text-muted small">Submission id: #{sub._id}</span>}
                      </td>
                      <td>
                        <span className="badge bg-secondary">
                          {isNotSubmitted ? 'N/A' : `Attempt #${sub.attempt_number}`}
                        </span>
                      </td>
                      <td>
                        <div className="small d-flex align-items-center gap-1 text-muted">
                          <FaRegClock size={12} />
                          <span>{sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'N/A'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          isNotSubmitted ? 'bg-danger' :
                          sub.status === 'Graded' ? 'bg-success' : 'bg-warning text-dark'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td>
                        {isNotSubmitted ? (
                          <span className="text-muted small">N/A</span>
                        ) : (
                          <div className="d-flex align-items-center gap-2">
                            <FaAward className={sub.status === 'Graded' ? 'text-success' : 'text-warning'} />
                            <span className="fw-bold">{earnedPoints} Points</span>
                          </div>
                        )}
                      </td>
                      <td className="text-end">
                        {isNotSubmitted ? (
                          <span className="text-muted small">No Submission</span>
                        ) : (
                          <button 
                            className="btn btn-xs btn-outline-primary px-3 fw-bold"
                            onClick={() => navigate(`/student/sql-submissions/${sub._id}`)}
                          >
                            <FaEye /> Detailed View
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="d-block d-md-none">
            {submissions.map(sub => {
              const isNotSubmitted = sub.status === 'Not Submitted';
              const earnedPoints = isNotSubmitted ? 0 : sub.final_marks;
              return (
                <div key={sub._id} className="card glass-card p-3 mb-3 border border-secondary border-opacity-10 shadow-sm">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="fw-bold fs-6 text-info">{sub.assignment_title}</div>
                    <span className={`badge ${isNotSubmitted ? 'bg-danger' : sub.status === 'Graded' ? 'bg-success' : 'bg-warning text-dark'}`}>
                      {sub.status}
                    </span>
                  </div>
                  
                  <div className="bg-dark bg-opacity-25 rounded p-2 mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="text-muted small">Attempt:</span>
                      <span className="badge bg-secondary">{isNotSubmitted ? 'N/A' : `#${sub.attempt_number}`}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="text-muted small">Date:</span>
                      <span className="small text-light">{sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted small">Marks:</span>
                      <div className="d-flex align-items-center gap-1">
                        {!isNotSubmitted && <FaAward className={sub.status === 'Graded' ? 'text-success' : 'text-warning'} size={14} />}
                        <span className="fw-bold text-light">{isNotSubmitted ? 'N/A' : `${earnedPoints} Pts`}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2">
                    {isNotSubmitted ? (
                      <button className="btn btn-sm btn-secondary w-100" disabled>No Submission</button>
                    ) : (
                      <button 
                        className="btn btn-sm btn-outline-primary fw-bold w-100 d-flex align-items-center justify-content-center gap-2"
                        onClick={() => navigate(`/student/sql-submissions/${sub._id}`)}
                      >
                        <FaEye /> Detailed View
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentSqlSubmissions;
