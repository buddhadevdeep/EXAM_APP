import API_BASE from '../config/api.js';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FaCheckCircle, FaUser, FaLock, FaExclamationTriangle, FaFileAlt } from 'react-icons/fa';

const VerifySubmission = () => {
  const { submissionId } = useParams();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submission, setSubmission] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Only fetch if user is logged in and is a Teacher
    if (!authLoading && user && user.role === 'Teacher') {
      const fetchSubmission = async () => {
        try {
          const res = await axios.get(`${API_BASE}/api/teacher/submissions/${submissionId}`);
          setSubmission(res.data.submission);
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to load submission details.');
        } finally {
          setLoading(false);
        }
      };
      fetchSubmission();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [submissionId, user, authLoading]);

  const handleVerify = async () => {
    setVerifying(true);
    setError('');
    try {
      await axios.post(`${API_BASE}/api/teacher/submissions/${submissionId}/verify`);
      setSuccess(true);
      if (submission) {
        setSubmission(prev => ({ ...prev, status: 'Submitted' }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify submission.');
    } finally {
      setVerifying(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-dark text-white">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // 1. Not Authenticated
  if (!user) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 px-3 bg-dark" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
        <div className="card glass-card p-5 text-center text-white shadow-lg" style={{ maxWidth: '480px', borderRadius: '24px' }}>
          <div className="text-warning mb-4">
            <FaLock size={56} />
          </div>
          <h3 className="fw-bold mb-3">Authentication Required</h3>
          <p className="text-muted mb-4">
            You must log in to the portal as a Teacher to verify and authorize this student's exam submission.
          </p>
          <Link 
            to={`/login?redirect=/verify-submission/${submissionId}`} 
            className="btn btn-primary btn-lg w-100 fw-bold shadow"
          >
            Sign In as Teacher
          </Link>
        </div>
      </div>
    );
  }

  // 2. Logged in but not a Teacher
  if (user.role !== 'Teacher') {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 px-3 bg-dark" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
        <div className="card glass-card p-5 text-center text-white shadow-lg" style={{ maxWidth: '480px', borderRadius: '24px' }}>
          <div className="text-danger mb-4">
            <FaExclamationTriangle size={56} />
          </div>
          <h3 className="fw-bold mb-3 text-danger">Access Denied</h3>
          <p className="text-muted mb-4">
            Only teachers have the authority to verify and approve student submissions. You are currently logged in as a <strong>{user.role}</strong>.
          </p>
          <Link to="/" className="btn btn-outline-secondary w-100 fw-bold">
            Back to Portal Home
          </Link>
        </div>
      </div>
    );
  }

  // 3. Error state
  if (error && !submission) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 px-3 bg-dark" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
        <div className="card glass-card p-5 text-center text-white shadow-lg" style={{ maxWidth: '480px', borderRadius: '24px' }}>
          <div className="text-danger mb-4">
            <FaExclamationTriangle size={56} />
          </div>
          <h3 className="fw-bold mb-3">Verification Error</h3>
          <p className="text-muted mb-4">{error}</p>
          <Link to="/teacher/dashboard" className="btn btn-outline-secondary w-100 fw-bold">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // 4. Success State
  if (success) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 px-3 bg-dark" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
        <div className="card glass-card p-5 text-center text-white shadow-lg border-success" style={{ maxWidth: '480px', borderRadius: '24px' }}>
          <div className="text-success mb-4">
            <FaCheckCircle size={64} />
          </div>
          <h3 className="fw-bold mb-3 text-success">Submission Approved</h3>
          <p className="text-muted mb-4">
            The exam submission for <strong>{submission?.student_name}</strong> has been successfully authorized and marked as submitted.
          </p>
          <Link to="/teacher/dashboard" className="btn btn-primary btn-lg w-100 fw-bold shadow">
            Go to Command Center
          </Link>
        </div>
      </div>
    );
  }

  // 5. Main verification dashboard for teacher
  const isPending = submission?.status === 'PendingVerification';

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 px-3 bg-dark" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
      <div className="card glass-card p-4 text-white shadow-lg" style={{ maxWidth: '520px', width: '100%', borderRadius: '24px' }}>
        <h3 className="fw-bold text-center text-gradient mb-4">Submission Verification</h3>
        
        {error && <div className="alert alert-danger py-2">{error}</div>}

        <div className="p-3 bg-light bg-opacity-10 rounded-4 mb-4">
          <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom border-secondary border-opacity-20">
            <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
              <FaUser size={20} />
            </div>
            <div>
              <h5 className="fw-bold mb-0">{submission?.student_name}</h5>
              <div className="small text-muted">{submission?.class_section} • Roll No: {submission?.roll_number}</div>
            </div>
          </div>

          <div className="mb-2">
            <span className="small text-muted d-block">Exam Title</span>
            <span className="fw-semibold d-flex align-items-center gap-2">
              <FaFileAlt className="text-primary" /> {submission?.exam_title}
            </span>
          </div>

          <div className="mt-3">
            <span className="small text-muted d-block">Verification Status</span>
            {isPending ? (
              <span className="badge bg-warning text-white mt-1 px-3 py-2 fs-6">
                Pending Verification
              </span>
            ) : (
              <span className="badge bg-success text-white mt-1 px-3 py-2 fs-6">
                {submission?.status}
              </span>
            )}
          </div>
        </div>

        {isPending ? (
          <button 
            className="btn btn-success btn-lg w-100 py-3 fw-bold shadow mt-2" 
            onClick={handleVerify}
            disabled={verifying}
          >
            {verifying ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Approving...
              </>
            ) : (
              <>
                <FaCheckCircle className="fs-5" /> Approve & Submit Exam
              </>
            )}
          </button>
        ) : (
          <div className="text-center mt-2">
            <div className="alert alert-info py-3 mb-4">
              This exam has already been finalized and verified.
            </div>
            <Link to="/teacher/dashboard" className="btn btn-primary w-100 py-2">
              Back to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifySubmission;
