import API_BASE from '../config/api.js';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaCheckCircle, FaArrowLeft } from 'react-icons/fa';
import MonacoEditorWrapper from '../components/MonacoEditorWrapper';

const GradeSubmission = () => {
  const { submissionId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState([]);
  const [overallFeedback, setOverallFeedback] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/teacher/submissions/${submissionId}`);
        setData(res.data);
        
        // Pre-fill grades based on existing details or defaults
        const initialGrades = res.data.questions.map(q => {
          const qId = q.question_id || q.id;
          const existingGrade = res.data.grades.find(g => Number(g.question_id) === Number(qId));
          const answer = res.data.answers.find(a => Number(a.question_id) === Number(qId));
          return {
            questionId: qId,
            marksObtained: existingGrade ? parseFloat(existingGrade.marks_obtained) : 0,
            feedback: existingGrade ? existingGrade.feedback : '',
            sqlQuery: answer ? answer.sql_query : '-- No answer submitted --',
            points: q.points
          };
        });
        setGrades(initialGrades);
        if (res.data.overallFeedback) {
          setOverallFeedback(res.data.overallFeedback.comments);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmission();
  }, [submissionId]);

  const handleGradeChange = (index, key, value) => {
    const updated = [...grades];
    updated[index][key] = value;
    setGrades(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/teacher/submissions/${submissionId}/grade`, {
        grades: grades.map(g => ({
          questionId: g.questionId,
          marksObtained: parseFloat(g.marksObtained),
          feedback: g.feedback
        })),
        overallFeedback
      });
      navigate(-1);
    } catch (err) {
      alert('Error saving grading details');
    }
  };

  if (loading || !data) return <div className="container mt-4"><div className="skeleton-line" /></div>;

  const { submission } = data;

  return (
    <div className="container mt-4 animated-fade">
      <button className="btn btn-xs btn-outline-secondary d-flex align-items-center gap-1 mb-3" onClick={() => navigate(-1)} type="button">
        <FaArrowLeft /> Back
      </button>

      <h3 className="fw-bold mb-2">Grading Dashboard</h3>
      <h5 className="text-muted mb-4">Student: {submission.student_name} ({submission.roll_number}) &bull; Exam: {submission.exam_title}</h5>

      <form onSubmit={handleSubmit}>
        {data.questions.map((q, index) => {
          const currentGrade = grades[index] || {};
          return (
            <div key={q.id} className="card glass-card p-3 p-sm-4 mb-4">
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-3">
                <div>
                  <h5 className="fw-bold mb-1">{q.title}</h5>
                  <p className="text-muted mb-0 small">{q.description}</p>
                </div>
                <span className="badge bg-secondary text-nowrap">{q.points} Max Points</span>
              </div>

              <div className="row">
                <div className="col-md-7 overflow-hidden">
                  <div className="mb-2 fw-semibold text-primary">Student's SQL Answer:</div>
                  <MonacoEditorWrapper 
                    value={(data.answers.find(a => Number(a.question_id) === Number(q.question_id || q.id))?.sql_query) || '-- No answer submitted --'} 
                    readOnly={true} 
                  />
                </div>
                <div className="col-md-5">
                  <div className="mb-2 fw-semibold text-success">Reference Solution Answer:</div>
                  <pre className="p-3 bg-dark text-white rounded mb-3" style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {q.sql_template || '-- No reference code provided --'}
                  </pre>
                  
                  <div className="mb-3">
                    <label className="form-label fw-bold">Award Score</label>
                    <input 
                      type="number" step="0.5" className="form-control" max={q.points} min={0} required
                      value={currentGrade.marksObtained || 0}
                      onChange={e => handleGradeChange(index, 'marksObtained', e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Feedback/Comments for Question</label>
                    <textarea 
                      className="form-control" rows="2"
                      value={currentGrade.feedback || ''}
                      onChange={e => handleGradeChange(index, 'feedback', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="card glass-card p-4 mb-4">
          <h5 className="fw-bold mb-3">Overall Performance Comments</h5>
          <textarea 
            className="form-control" rows="3" required placeholder="Provide general feedback on SQL code cleanliness, optimization, and accuracy..."
            value={overallFeedback} onChange={e => setOverallFeedback(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-success btn-lg w-100 d-flex align-items-center justify-content-center gap-2 mb-5">
          <FaCheckCircle /> Finalize and Publish Marks
        </button>
      </form>
    </div>
  );
};

export default GradeSubmission;


