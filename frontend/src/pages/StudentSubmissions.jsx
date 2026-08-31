import API_BASE from '../config/api.js';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaGraduationCap, FaRegCommentDots } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const StudentSubmissions = () => {
  const { cachedSubmissions, setCachedSubmissions } = useAuth();
  const [submissions, setSubmissions] = useState(cachedSubmissions || []);
  const [loading, setLoading] = useState(!cachedSubmissions);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/student/submissions`);
        setSubmissions(res.data);
        setCachedSubmissions(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  if (loading) return <div className="container mt-4"><div className="skeleton-line" /></div>;

  return (
    <div className="container mt-4 animated-fade">
      <h3 className="fw-bold mb-4">Your Exam History & Performance</h3>

      <div className="card glass-card p-3 p-md-4">
        <div className="d-none d-md-block table-responsive">
          <table className="table align-middle text-nowrap">
            <thead>
              <tr>
                <th>Exam Title</th>
                <th>Subject</th>
                <th>Submitted Date</th>
                <th>Status</th>
                <th>Result/Marks</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <Link to={`/student/exams/${sub.exam_id}?submissionId=${sub.id}`} className="text-decoration-none text-primary fw-semibold">
                      {sub.exam_title}
                    </Link>
                  </td>
                  <td>{sub.subject_name}</td>
                  <td>
                    {sub.submitted_at ? (() => {
                      const d = new Date(sub.submitted_at);
                      return isNaN(d.getTime()) ? sub.submitted_at : d.toLocaleString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                      });
                    })() : 'N/A'}
                  </td>
                  <td>
                    <span className={`status-badge px-2 py-1 ${
                      sub.status === 'Graded' ? 'bg-success text-white' : 
                      sub.status === 'In Progress' ? 'bg-warning text-dark' : 
                      sub.status === 'Not Started' ? 'bg-secondary text-white' : 
                      sub.status === 'Absent' ? 'bg-danger text-white' : 
                      'bg-primary text-white'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td>
                    {sub.status === 'Graded' ? (
                      <span className="fw-bold text-success">
                        {sub.marks_obtained !== null ? parseFloat(sub.marks_obtained) : 0} / {sub.total_marks}
                      </span>
                    ) : sub.status === 'Absent' ? (
                      <span className="text-danger small fw-bold">Absent</span>
                    ) : sub.status === 'In Progress' ? (
                      <span className="text-warning small fw-bold">In Progress</span>
                    ) : sub.status === 'Not Started' ? (
                      <span className="text-muted small">Not Started</span>
                    ) : (
                      <span className="text-muted small">Grading Pending</span>
                    )}
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted">You have not submitted any exams yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="d-block d-md-none">
          {submissions.length === 0 ? (
            <div className="text-center py-4 text-muted">You have not submitted any exams yet.</div>
          ) : (
            submissions.map((sub) => (
              <div key={sub.id} className="card glass-card p-3 mb-3 border border-secondary border-opacity-10 shadow-sm">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <Link to={`/student/exams/${sub.exam_id}?submissionId=${sub.id}`} className="text-decoration-none text-primary fw-bold fs-6">
                    {sub.exam_title}
                  </Link>
                  <span className={`status-badge px-2 py-1 ${
                    sub.status === 'Graded' ? 'bg-success text-white' : 
                    sub.status === 'In Progress' ? 'bg-warning text-dark' : 
                    sub.status === 'Not Started' ? 'bg-secondary text-white' : 
                    sub.status === 'Absent' ? 'bg-danger text-white' : 
                    'bg-primary text-white'
                  }`}>
                    {sub.status}
                  </span>
                </div>
                
                <div className="bg-dark bg-opacity-25 rounded p-2 mb-2 mt-2">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted small fw-semibold text-uppercase">Score</span>
                    {sub.status === 'Graded' ? (
                      <span className="fw-bold text-success">{sub.marks_obtained !== null ? parseFloat(sub.marks_obtained) : 0} / {sub.total_marks}</span>
                    ) : sub.status === 'Absent' ? (
                       <span className="text-danger small fw-bold">Absent</span>
                    ) : (
                       <span className="text-muted small">Pending</span>
                    )}
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted small fw-semibold text-uppercase">Subject</span>
                    <span className="small text-light fw-medium text-end">{sub.subject_name}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted small fw-semibold text-uppercase">Time</span>
                    <span className="small text-light text-end">
                      {sub.submitted_at ? (() => {
                        const d = new Date(sub.submitted_at);
                        return isNaN(d.getTime()) ? sub.submitted_at : d.toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
                      })() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Show detailed teacher remarks for graded exams */}
      {submissions.filter(sub => sub.status === 'Graded').map((sub) => (
        <div key={`details-${sub.id}`} className="card glass-card p-4 mt-4 border-success animate-fade">
          <h5 className="fw-bold text-success d-flex align-items-center gap-2 mb-3">
            <FaGraduationCap /> Teacher Feedback: {sub.exam_title}
          </h5>
          
          <div className="p-3 bg-light dark-mode-bg-dark rounded">
            <h6 className="fw-semibold d-flex align-items-center gap-1 mb-2">
              <FaRegCommentDots /> Review Comments
            </h6>
            <p className="mb-0 text-dark fw-bold">
              Total Score: {sub.marks_obtained !== null ? parseFloat(sub.marks_obtained) : 0} / {sub.total_marks} Marks
            </p>
            <p className="text-muted mt-2 mb-0">
              {sub.teacher_comments ? sub.teacher_comments : 'No comments provided by evaluator.'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StudentSubmissions;


