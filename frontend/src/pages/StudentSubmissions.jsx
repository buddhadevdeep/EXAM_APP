import API_BASE from '../config/api.js';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaGraduationCap, FaRegCommentDots } from 'react-icons/fa';

const StudentSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/student/submissions`);
        setSubmissions(res.data);
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

      <div className="card glass-card p-4">
        <div className="table-responsive">
          <table className="table align-middle">
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
                  <td><strong>{sub.exam_title}</strong></td>
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
                    <span className={`status-badge ${sub.status === 'Graded' ? 'bg-success text-white' : 'bg-primary text-white'}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td>
                    {sub.status === 'Graded' ? (
                      <span className="fw-bold text-success">
                        {sub.marks_obtained !== null ? parseFloat(sub.marks_obtained) : 0} / {sub.total_marks}
                      </span>
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


