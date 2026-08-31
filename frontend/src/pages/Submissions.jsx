import API_BASE from '../config/api.js';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaUserGraduate, FaClipboardList, FaDownload, FaArrowLeft } from 'react-icons/fa';

const Submissions = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
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
      <button className="btn btn-xs btn-outline-secondary d-flex align-items-center gap-1 mb-3" onClick={() => navigate(-1)}>
        <FaArrowLeft /> Back
      </button>

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <h3 className="fw-bold">Student Submissions</h3>
        <a href={`${API_BASE}/api/teacher/exams/${examId}/export?token=${localStorage.getItem('token')}`} className="btn btn-success d-flex align-items-center gap-2">
          <FaDownload /> Export Marks (Excel)
        </a>
      </div>

      <div className="card glass-card p-3 p-md-4">
        {/* Desktop View */}
        <div className="d-none d-md-block table-responsive">
          <table className="table align-middle text-nowrap">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Roll Number</th>
                <th>Section</th>
                <th>Submission Status</th>
                <th>Score</th>
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
                    <span className={`status-badge ${
                      sub.status === 'Graded' ? 'bg-success text-white' :
                      sub.status === 'Submitted' ? 'bg-primary text-white' :
                      sub.status === 'Draft' ? 'bg-warning text-dark' :
                      sub.status === 'Absent' ? 'bg-danger text-white' :
                      sub.status === 'Not Started' ? 'bg-secondary text-white' : 'bg-light text-dark'
                    }`}>
                      {sub.status === 'Draft' ? 'In Progress' : sub.status}
                    </span>
                  </td>
                  <td>
                    {sub.status === 'Graded' ? (
                      <span className="fw-bold text-info" style={{ fontSize: '0.9rem' }}>
                        {sub.score} / {sub.total_possible_marks} Marks
                      </span>
                    ) : (
                      <span className="text-muted small">-</span>
                    )}
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
                    })() : sub.status === 'Draft' ? 'In progress' : 'Not started yet'}
                  </td>
                  <td>
                    {(sub.status === 'Submitted' || sub.status === 'Graded') ? (
                      <Link to={`/teacher/submissions/${sub.id}`} className="btn btn-sm btn-primary d-flex align-items-center gap-1" style={{ width: 'max-content' }}>
                        <FaClipboardList /> {sub.status === 'Graded' ? 'Edit Grades' : 'Review & Grade'}
                      </Link>
                    ) : sub.status === 'Draft' ? (
                      <span className="text-muted small fw-medium">In Progress</span>
                    ) : (
                      <span className="text-muted small fw-medium">Not Started</span>
                    )}
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">No student submissions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="d-block d-md-none">
          {submissions.length === 0 ? (
            <div className="text-center py-4 text-muted">No student submissions found.</div>
          ) : (
            submissions.map((sub) => (
              <div key={sub.id} className="card glass-card p-3 mb-3 shadow-sm border border-secondary border-opacity-10">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h6 className="fw-bold fs-6 mb-1">{sub.student_name}</h6>
                    <span className="text-muted small">Roll No: {sub.roll_number} &bull; Section: {sub.class_section}</span>
                  </div>
                  <span className={`status-badge px-2 py-1 ${
                    sub.status === 'Graded' ? 'bg-success text-white' :
                    sub.status === 'Submitted' ? 'bg-primary text-white' :
                    sub.status === 'Draft' ? 'bg-warning text-dark' :
                    sub.status === 'Absent' ? 'bg-danger text-white' :
                    sub.status === 'Not Started' ? 'bg-secondary text-white' : 'bg-light text-dark'
                  }`}>
                    {sub.status === 'Draft' ? 'In Progress' : sub.status}
                  </span>
                </div>

                <div className="bg-dark bg-opacity-25 rounded p-2 mb-3 mt-2">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted small fw-semibold text-uppercase">Score</span>
                    <span className="fw-bold text-info">
                      {sub.status === 'Graded' ? `${sub.score} / ${sub.total_possible_marks} Marks` : '-'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted small fw-semibold text-uppercase">Time</span>
                    <span className="small text-light text-end">
                      {sub.submitted_at ? (() => {
                        const d = new Date(sub.submitted_at);
                        return isNaN(d.getTime()) ? sub.submitted_at : d.toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
                      })() : sub.status === 'Draft' ? 'In progress' : 'Not started yet'}
                    </span>
                  </div>
                </div>

                <div className="mt-2">
                  {(sub.status === 'Submitted' || sub.status === 'Graded') ? (
                    <Link to={`/teacher/submissions/${sub.id}`} className="btn btn-sm w-100 d-flex align-items-center justify-content-center gap-2 btn-primary">
                      <FaClipboardList /> {sub.status === 'Graded' ? 'Edit Existing Grades' : 'Process Review & Grade'}
                    </Link>
                  ) : (
                    <button className="btn btn-sm btn-secondary w-100" disabled>
                      {sub.status === 'Draft' ? 'In Progress' : 'Not Started'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Submissions;


