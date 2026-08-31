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
        <div className="card glass-card p-4">
          <div className="table-responsive">
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
                  const totalPoints = isNotSubmitted ? 0 : sub.answers.reduce((sum, a) => sum + a.auto_marks, 0);
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
        </div>
      )}
    </div>
  );
};

export default StudentSqlSubmissions;
