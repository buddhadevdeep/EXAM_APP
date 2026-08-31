import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_BASE from '../config/api';
import { 
  FaGraduationCap, FaEye, FaAward, FaCalendarAlt, 
  FaUserGraduate, FaFileAlt, FaClipboardCheck, FaRegClock, FaDatabase 
} from 'react-icons/fa';

const SqlGrades = () => {
  const [activeTab, setActiveTab] = useState('exams'); // 'exams' | 'sql-assignments'
  const [regularExams, setRegularExams] = useState([]);
  const [sqlSubmissions, setSqlSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

      if (activeTab === 'exams') {
        const res = await axios.get(`${API_BASE}/api/teacher/exams`, { headers });
        // Filter out practice assignments from regular exams list if needed
        const filtered = res.data.filter(e => e.exam_type !== 'Assignment');
        setRegularExams(filtered);
      } else {
        const res = await axios.get(`${API_BASE}/api/sql-practice/submissions/review`, { headers });
        setSqlSubmissions(res.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load grading details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h2 className="fw-bold mb-1 text-primary d-flex align-items-center gap-2">
          <FaGraduationCap /> Exams & Assignments Grading
        </h2>
        <p className="text-muted">Review student solutions and grading for both standard proctored theory exams and sandbox SQL practice modules.</p>
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills gap-2 mb-4 bg-dark bg-opacity-25 p-2 rounded-3 border border-secondary border-opacity-10 d-inline-flex">
        <li className="nav-item">
          <button 
            type="button"
            className={`nav-link fw-bold px-4 py-2 border-0 rounded-2 transition-all d-flex align-items-center gap-2 ${
              activeTab === 'exams' ? 'active bg-primary text-white shadow-sm' : 'bg-transparent text-muted'
            }`}
            onClick={() => setActiveTab('exams')}
          >
            📝 Proctored Exams
          </button>
        </li>
        <li className="nav-item">
          <button 
            type="button"
            className={`nav-link fw-bold px-4 py-2 border-0 rounded-2 transition-all d-flex align-items-center gap-2 ${
              activeTab === 'sql-assignments' ? 'active bg-info text-dark shadow-sm' : 'bg-transparent text-muted'
            }`}
            onClick={() => setActiveTab('sql-assignments')}
          >
            📊 SQL Practice Assignments
          </button>
        </li>
      </ul>

      {errorMsg && <div className="alert alert-danger py-2">{errorMsg}</div>}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : activeTab === 'exams' ? (
        /* Regular Exams Section */
        regularExams.length === 0 ? (
          <div className="card glass-card p-5 text-center text-muted border border-secondary border-opacity-10">
            <FaFileAlt className="fs-1 mb-3 text-warning" />
            <p className="mb-0">No regular proctored exams found.</p>
          </div>
        ) : (
          <div className="table-responsive rounded border border-secondary border-opacity-10 shadow-lg">
            <table className="table align-middle mb-0 text-nowrap">
              <thead className="table-secondary bg-opacity-20 header-dark font-monospace text-uppercase" style={{ fontSize: '0.8rem' }}>
                <tr>
                  <th>Exam Title</th>
                  <th>Subject</th>
                  <th>Total Marks</th>
                  <th>Duration</th>
                  <th>Start / End Time</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {regularExams.map(exam => (
                  <tr key={exam.id} className="border-bottom border-secondary border-opacity-10">
                    <td>
                      <span className="fw-bold text-info">{exam.title}</span>
                    </td>
                    <td>{exam.subject_name}</td>
                    <td>
                      <span className="fw-semibold text-warning">{exam.total_marks} Marks</span>
                    </td>
                    <td>{exam.duration_minutes} Mins</td>
                    <td>
                      <div className="small text-muted">
                        <div>Start: {exam.start_time ? new Date(exam.start_time).toLocaleString() : 'Open'}</div>
                        <div>End: {exam.end_time ? new Date(exam.end_time).toLocaleString() : 'Closed'}</div>
                      </div>
                    </td>
                    <td>
                      {new Date() > new Date(exam.end_time) ? (
                        <span className="badge bg-secondary">Expired</span>
                      ) : exam.is_published ? (
                        <span className="badge bg-success">Active</span>
                      ) : (
                        <span className="badge bg-warning text-dark">Draft</span>
                      )}
                    </td>
                    <td className="text-end">
                      <button 
                        className="btn btn-xs btn-primary fw-bold"
                        onClick={() => navigate(`/teacher/exams/${exam.id}/submissions`)}
                      >
                        <FaClipboardCheck className="me-1" /> View Submissions
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* SQL Practice Submissions Section */
        sqlSubmissions.length === 0 ? (
          <div className="card glass-card p-5 text-center text-muted border border-secondary border-opacity-10">
            <FaDatabase className="fs-1 mb-3 text-warning" />
            <p className="mb-0">No student SQL practice submissions available for grading review.</p>
          </div>
        ) : (
          <div className="table-responsive rounded border border-secondary border-opacity-10 shadow-lg">
            <table className="table align-middle mb-0 text-nowrap">
              <thead className="table-secondary bg-opacity-20 header-dark font-monospace text-uppercase" style={{ fontSize: '0.8rem' }}>
                <tr>
                  <th>Student Details</th>
                  <th>Assignment</th>
                  <th>Attempt</th>
                  <th>Submitted At</th>
                  <th>Status</th>
                  <th>Grades</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sqlSubmissions.map(sub => (
                  <tr key={sub._id} className="border-bottom border-secondary border-opacity-10">
                    <td>
                      <div className="fw-bold text-white d-flex align-items-center gap-2">
                        <FaUserGraduate className="text-muted" size={13} />
                        <span>{sub.student_name}</span>
                      </div>
                      <span className="text-muted small">Roll No: {sub.student_roll}</span>
                    </td>
                    <td>
                      <div className="fw-semibold text-info">{sub.assignment_title}</div>
                      <span className="text-muted small">Sub ID: #{sub._id}</span>
                    </td>
                    <td>
                      <span className="badge bg-secondary">Attempt #{sub.attempt_number}</span>
                    </td>
                    <td>
                      <div className="small text-muted d-flex align-items-center gap-1">
                        <FaCalendarAlt size={11} />
                        <span>{new Date(sub.submitted_at).toLocaleString()}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        sub.status === 'Graded' ? 'bg-success' : 'bg-warning text-dark'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <FaAward className={sub.status === 'Graded' ? 'text-success' : 'text-warning'} />
                        <span className="fw-bold">
                          {sub.final_marks} / {sub.total_possible_marks} Marks
                        </span>
                      </div>
                    </td>
                    <td className="text-end">
                      <button 
                        className={`btn btn-xs fw-bold px-3 ${
                          sub.status === 'Graded' ? 'btn-outline-info' : 'btn-primary'
                        }`}
                        onClick={() => navigate(`/teacher/sql-grades/${sub._id}`)}
                      >
                        {sub.status === 'Graded' ? 'Edit Grades' : 'Review & Grade'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};

export default SqlGrades;
