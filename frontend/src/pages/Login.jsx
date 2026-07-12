import API_BASE from '../config/api.js';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSignInAlt, FaUserPlus } from 'react-icons/fa';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleId, setRoleId] = useState(3); // Default Student
  const [rollNumber, setRollNumber] = useState('');
  const [classSection, setClassSection] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAction = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (isRegister) {
        await axios.post(`${API_BASE}/api/auth/register`, {
          email, password, roleId, fullName, rollNumber, classSection, department
        });
        setSuccess('Registration successful! Please login.');
        setIsRegister(false);
        setPassword('');
      } else {
        const loggedUser = await login(email, password);
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get('redirect');
        if (redirectUrl) {
          navigate(redirectUrl);
        } else if (loggedUser.role === 'Admin') {
          navigate('/admin/dashboard');
        } else if (loggedUser.role === 'Teacher') {
          navigate('/teacher/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(err.response.data.errors.map(e => e.msg).join(', '));
      } else {
        setError(err.response?.data?.message || 'Action failed. Please try again.');
      }
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 px-3 bg-dark" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
      <div className="card glass-card p-4 animated-fade text-white shadow-lg border-secondary" style={{ maxWidth: '480px', width: '100%', borderRadius: '24px' }}>
        
        {/* Sign In Header */}
        <div className="d-flex justify-content-center mb-4">
          <h3 className="text-primary border-bottom border-primary border-3 pb-2 fw-bold">Sign In</h3>
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}
        {success && <div className="alert alert-success py-2">{success}</div>}

        <form onSubmit={handleAction}>
          {isRegister && (
            <div className="mb-3">
              <label className="form-label text-light">Full Name</label>
              <input 
                type="text" 
                className="form-control bg-dark text-white border-secondary" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                required 
              />
            </div>
          )}

          <div className="mb-3">
            <label className="form-label text-light">Email Address</label>
            <input 
              type="email" 
              className="form-control bg-dark text-white border-secondary" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="mb-3">
            <label className="form-label text-light">Password</label>
            <input 
              type="password" 
              className="form-control bg-dark text-white border-secondary" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          {isRegister && (
            <>
              <div className="mb-3">
                <label className="form-label text-light">Role Profile</label>
                <select 
                  className="form-select bg-dark text-white border-secondary" 
                  value={roleId} 
                  onChange={(e) => setRoleId(parseInt(e.target.value))}
                >
                  <option value={3}>Student</option>
                  <option value={2}>Teacher</option>
                </select>
              </div>

              {roleId === 3 ? (
                <div className="row">
                  <div className="col-6 mb-3">
                    <label className="form-label text-light">Roll Number</label>
                    <input 
                      type="text" 
                      className="form-control bg-dark text-white border-secondary" 
                      value={rollNumber} 
                      onChange={(e) => setRollNumber(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="col-6 mb-3">
                    <label className="form-label text-light">Class/Section</label>
                    <input 
                      type="text" 
                      className="form-control bg-dark text-white border-secondary" 
                      value={classSection} 
                      onChange={(e) => setClassSection(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
              ) : (
                <div className="mb-3">
                  <label className="form-label text-light">Department Name</label>
                  <input 
                    type="text" 
                    className="form-control bg-dark text-white border-secondary" 
                    value={department} 
                    onChange={(e) => setDepartment(e.target.value)} 
                    required 
                  />
                </div>
              )}
            </>
          )}

          <button type="submit" className="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2 mt-4">
            {isRegister ? <FaUserPlus /> : <FaSignInAlt />}
            {isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {!isRegister && (
          <div className="mt-4 p-3 bg-dark border border-secondary rounded-3 small" style={{ opacity: 0.85 }}>
            <span className="fw-bold text-primary">Demo Logins (Password: password123):</span>
            <div className="mt-2 text-muted">Admin: admin@platform.com</div>
            <div className="text-muted">Teacher: teacher1@platform.com</div>
            <div className="text-muted">Student: student1@platform.com</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;


