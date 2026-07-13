import API_BASE from '../config/api.js';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { FaUserGraduate, FaClipboardList, FaDownload } from 'react-icons/fa';

const Submissions = () => {
  const { examId } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/teacher/exams/${examId}/submissions`);
        setSubmissions(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [examId]);

  if (loading) return <div className="container mt-4"><div className="skeleton-line" /></div>;

  return (
    <div className="container mt-4 animated-fade">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold">Student Submissions</h3>
        <a href={`${API_BASE}/api/teacher/exams/${examId}/export`} className="btn btn-success d-flex align-items-center gap-2">
          <FaDownload /> Export Marks (Excel)
        </a>
      </div>

      <div className="card glass-card p-4">
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Roll Number</th>
                <th>Section</th>
                <th>Submission Status</th>
                <th>Submitted Date</th>
                <th>Grading Details</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.id}>
                  <td><strong>{sub.student_name}</strong></td>
                  <td>{sub.roll_number}</td>
                  <td>{sub.class_section}</td>
                  <td>
                    <span className={`status-badge ${sub.status === 'Graded' ? 'bg-success text-white' : sub.status === 'Submitted' ? 'bg-primary text-white' : 'bg-warning text-dark'}`}>
                      {sub.status}
                    </span>
                  </td>
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
                    })() : 'Not submitted yet'}
                  </td>
                  <td>
                    {sub.status !== 'Draft' ? (
                      <Link to={`/teacher/submissions/${sub.id}`} className="btn btn-sm btn-primary d-flex align-items-center gap-1" style={{ width: 'max-content' }}>
                        <FaClipboardList /> {sub.status === 'Graded' ? 'Edit Grades' : 'Review & Grade'}
                      </Link>
                    ) : (
                      <span className="text-muted small">In Progress</span>
                    )}
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">No student submissions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Submissions;


