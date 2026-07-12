import API_BASE from '../config/api.js';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FaPlus, FaCheck, FaTimes, FaDownload, FaCamera } from 'react-icons/fa';

const TeacherDashboard = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);;

  const fetchExams = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/teacher/exams`);
      setExams(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const toggleStatus = async (examId, currentPublished, currentClosed) => {
    try {
      // Toggle publish or close state
      await axios.put(`${API_BASE}/api/teacher/exams/${examId}/status`, {
        isPublished: currentPublished ? 1 : 0,
        isClosed: currentClosed ? 1 : 0
      });
      fetchExams();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExam = async (examId, title) => {
    if (!window.confirm(`Are you sure you want to delete exam "${title}"? This will permanently delete the exam and all student submissions.`)) return;
    try {
      await axios.delete(`${API_BASE}/api/teacher/exams/${examId}`);
      alert('Exam deleted successfully!');
      fetchExams();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting exam.');
    }
  };

  if (loading) return <div className="container mt-4"><div className="skeleton-line" /></div>;

  return (
    <div className="container mt-4 animated-fade">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <h3 className="fw-bold text-gradient mb-0">Teacher Command Center</h3>
        <div className="d-flex flex-wrap gap-2" style={{ width: 'fit-content' }}>
          <Link to="/teacher/scan" className="btn btn-outline-primary d-flex align-items-center gap-2 shadow-sm">
            <FaCamera /> Scan Student QR
          </Link>
          <Link to="/teacher/exams/new" className="btn btn-primary d-flex align-items-center gap-2 shadow-sm">
            <FaPlus /> Design New Exam
          </Link>
        </div>
      </div>

      <div className="row">
        {/* Exams List column */}
        <div className="col-12">
          <h4 className="fw-bold mb-3 text-secondary">Active Exams</h4>
          <div className="row">
            {exams.map((exam) => (
              <div key={exam.id} className="col-md-6 mb-4">
                <div className="card glass-card h-100 p-3 shadow-sm">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="badge bg-secondary">{exam.subject_name}</span>
                    <div className="d-flex gap-1">
                      <span className={`status-badge ${exam.is_published ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
                        {exam.is_published ? 'Published' : 'Draft'}
                      </span>
                      <span className={`status-badge ${exam.is_closed ? 'bg-danger text-white' : 'bg-info text-white'}`}>
                        {exam.is_closed ? 'Closed' : 'Accepting'}
                      </span>
                    </div>
                  </div>

                  <h5 className="fw-bold">{exam.title}</h5>
                  <p className="text-muted small flex-grow-1">{exam.description}</p>
                  
                  <div className="row text-center mb-3">
                    <div className="col-6 border-end">
                      <div className="text-muted small">Total Marks</div>
                      <div className="fw-bold">{exam.total_marks}</div>
                    </div>
                    <div className="col-6">
                      <div className="text-muted small">Duration</div>
                      <div className="fw-bold">{exam.duration_minutes} Mins</div>
                    </div>
                  </div>

                  <div className="d-flex gap-1 mt-2">
                    <Link to={`/teacher/exams/${exam.id}/edit`} className="btn btn-sm btn-outline-secondary w-100">
                      Edit Settings & Questions
                    </Link>
                  </div>
                  <div className="d-flex gap-2 mt-2">
                    <Link to={`/teacher/exams/${exam.id}/submissions`} className="btn btn-sm btn-outline-primary flex-grow-1">
                      Submissions
                    </Link>
                    <button 
                      className={`btn btn-sm ${exam.is_published ? 'btn-outline-warning' : 'btn-success'}`}
                      onClick={() => toggleStatus(exam.id, !exam.is_published ? 1 : 0, exam.is_closed)}
                    >
                      {exam.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button 
                      className={`btn btn-sm ${exam.is_closed ? 'btn-success' : 'btn-danger'}`}
                      onClick={() => toggleStatus(exam.id, exam.is_published, !exam.is_closed ? 1 : 0)}
                    >
                      {exam.is_closed ? 'Reopen Exam' : 'Close Exam'}
                    </button>
                  </div>
                  <button 
                    className="btn btn-sm btn-outline-danger w-100 mt-2"
                    onClick={() => handleDeleteExam(exam.id, exam.title)}
                  >
                    Delete Exam
                  </button>
                </div>
              </div>
            ))}
            {exams.length === 0 && (
              <div className="col-12 text-center py-5 text-muted">
                No exams found. Click "Design New Exam" to create one.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;


