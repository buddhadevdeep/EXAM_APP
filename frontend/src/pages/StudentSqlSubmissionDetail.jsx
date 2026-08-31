import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import API_BASE from '../config/api';
import { FaHistory, FaAward, FaCheckCircle, FaTimesCircle, FaArrowLeft, FaDatabase, FaRegLightbulb } from 'react-icons/fa';

const StudentSqlSubmissionDetail = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchSubmissionDetail();
  }, [submissionId]);

  const fetchSubmissionDetail = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/sql-practice/submissions/review/${submissionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDetail(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load submission details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (errorMsg || !detail) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger py-2">{errorMsg || 'Submission detail not found.'}</div>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/student/sql-submissions')}>
          Back to History
        </button>
      </div>
    );
  }

  const { submission, assignment, database } = detail;
  const totalPossible = assignment.questions.reduce((sum, q) => sum + q.points, 0);
  const totalEarned = submission.answers.reduce((sum, a) => sum + (a.manual_marks !== null && a.manual_marks !== undefined ? a.manual_marks : 0), 0);

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button className="btn btn-xs btn-outline-secondary d-flex align-items-center gap-1 mb-2" onClick={() => navigate('/student/sql-submissions')}>
            <FaArrowLeft /> Back to Submissions
          </button>
          <h2 className="fw-bold mb-1 text-primary d-flex align-items-center gap-2">
            <FaHistory /> Review Attempt #{submission.attempt_number}
          </h2>
          <p className="text-muted mb-0">{assignment.title} • Database: {database.name}</p>
        </div>

        <div className="card glass-card px-4 py-2 border border-info border-opacity-30 text-end">
          <span className="text-muted small">Total Score Earned</span>
          <h3 className="fw-bold text-success mb-0 d-flex align-items-center gap-2">
            <FaAward /> {totalEarned} / {totalPossible} Marks
          </h3>
        </div>
      </div>

      <div className="row g-4">
        {/* Questions Breakdown */}
        <div className="col-12">
          {assignment.questions.map((q, idx) => {
            const ans = submission.answers.find(a => a.question_idx === idx) || {};
            const finalScore = ans.manual_marks !== null && ans.manual_marks !== undefined ? ans.manual_marks : 0;
            const isGraded = ans.manual_marks !== null && ans.manual_marks !== undefined;

            return (
              <div key={idx} className="card glass-card p-4 mb-4 border border-secondary border-opacity-15 rounded-3 shadow">
                <div className="d-flex justify-content-between align-items-baseline mb-3">
                  <h5 className="fw-bold text-info">Question Task #{idx + 1}</h5>
                  <div className="d-flex gap-2">
                    <span className="badge bg-secondary font-monospace" style={{ fontSize: '0.85rem' }}>
                      Marks: {finalScore} / {q.points}
                    </span>
                    {isGraded ? (
                      <span className="badge bg-success d-flex align-items-center gap-1"><FaCheckCircle /> Graded</span>
                    ) : (
                      <span className="badge bg-warning text-dark d-flex align-items-center gap-1"><FaTimesCircle /> Pending</span>
                    )}
                  </div>
                </div>

                <div className="question-text-box fs-6">{q.question_text}</div>

                <div className="row g-3">
                  {/* Submitted Query */}
                  <div className="col-lg-7">
                    <span className="text-muted small fw-bold text-uppercase d-block mb-1">Your Submitted SQL:</span>
                    <pre className="code-preview">
                      {ans.submitted_query ? ans.submitted_query : '-- No query submitted --'}
                    </pre>
                  </div>

                  {/* Grading details & teacher feedback */}
                  <div className="col-lg-5">
                    <div className="card glass-card p-3 h-100 d-flex flex-column justify-content-between">
                      <div>
                        {isGraded ? (
                          <div className="alert alert-secondary py-1 px-2 small mb-2 d-inline-block bg-secondary bg-opacity-25 border-0">
                            * Teacher Grade Override Applied
                          </div>
                        ) : null}

                        <span className="text-muted small fw-bold text-uppercase d-block mb-1">Grading Status:</span>
                        <div className="mb-3 d-flex align-items-center gap-2 small">
                          {isGraded ? (
                            <span className="text-success fw-bold d-flex align-items-center gap-1">
                              <FaCheckCircle /> Graded successfully. Review final score.
                            </span>
                          ) : (
                            <span className="text-warning fw-bold d-flex align-items-center gap-1">
                              <FaRegLightbulb /> Pending review by teacher.
                            </span>
                          )}
                        </div>
                      </div>

                      {ans.feedback && (
                        <div className="pt-2 border-top border-secondary border-opacity-10">
                          <span className="text-muted small fw-bold text-uppercase d-block mb-1">Teacher Feedback:</span>
                          <div className="small font-italic text-warning">
                            "{ans.feedback}"
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudentSqlSubmissionDetail;
