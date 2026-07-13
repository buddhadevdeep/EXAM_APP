import API_BASE from '../config/api.js';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSignInAlt, FaUserPlus, FaSun, FaMoon } from 'react-icons/fa';

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
  const { login, darkMode, toggleTheme } = useAuth();
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
    <div 
      className="d-flex align-items-center justify-content-center min-vh-100 px-3 position-relative" 
      style={{ 
        background: darkMode 
          ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' 
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        transition: 'background 0.3s ease'
      }}
    >
      {/* Floating Theme Toggle */}
      <button 
        onClick={toggleTheme} 
        className="btn btn-outline-secondary position-absolute top-0 end-0 m-4 rounded-circle p-0 d-flex align-items-center justify-content-center shadow-sm"
        style={{ width: '40px', height: '40px' }}
        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        type="button"
      >
        {darkMode ? <FaSun className="text-warning" /> : <FaMoon />}
      </button>

      <div className="d-flex flex-column align-items-center" style={{ maxWidth: '480px', width: '100%' }}>
        <h1 className="fw-bold mb-4 text-center text-gradient text-uppercase animate-fade" style={{ letterSpacing: '2px', fontSize: '2.4rem' }}>
          SQL EXAM APP
        </h1>

        <div className="card glass-card p-4 animated-fade shadow-lg w-100" style={{ borderRadius: '24px' }}>
          
          {/* Sign In Header */}
          <div className="d-flex justify-content-center mb-4">
            <h3 className="text-primary border-bottom border-primary border-3 pb-2 fw-bold">Sign In</h3>
          </div>

          {error && <div className="alert alert-danger py-2">{error}</div>}
          {success && <div className="alert alert-success py-2">{success}</div>}

          <form onSubmit={handleAction}>
            {isRegister && (
              <div className="mb-3">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  required 
                />
              </div>
            )}

            <div className="mb-3">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-control" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-control" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>

            {isRegister && (
              <>
                <div className="mb-3">
                  <label className="form-label">Role Profile</label>
                  <select 
                    className="form-select" 
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
                      <label className="form-label">Roll Number</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={rollNumber} 
                        onChange={(e) => setRollNumber(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="col-6 mb-3">
                      <label className="form-label">Class/Section</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={classSection} 
                        onChange={(e) => setClassSection(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mb-3">
                    <label className="form-label">Department Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
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
        </div>

        <div className="text-center mt-4 text-muted small" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>
          developed by @buddhadev deep and @manav delvadiya
        </div>
      </div>
    </div>
  );
};

export default Login;


