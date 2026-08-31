import API_BASE from '../config/api.js';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSignInAlt, FaUserPlus, FaSun, FaMoon, FaEye, FaEyeSlash } from 'react-icons/fa';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <style>{`
        .login-input:focus {
          border-color: var(--primary-color) !important;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.18) !important;
        }
      `}</style>

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
        <h1 className="fw-bold mb-4 text-center text-gradient text-uppercase animate-fade" style={{ letterSpacing: '2px', fontSize: 'clamp(1.5rem, 5vw, 2.1rem)' }}>
          SQL Practice & Exam Hub
        </h1>

        <div 
          className="card glass-card p-4 p-sm-5 animated-fade shadow-lg w-100" 
          style={{ 
            borderRadius: '24px',
            background: darkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.96)',
            boxShadow: darkMode 
              ? '0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 50px -5px rgba(99, 102, 241, 0.15)' 
              : '0 25px 50px -12px rgba(0, 0, 0, 0.16), 0 0 15px -3px rgba(99, 102, 241, 0.05)',
            border: darkMode ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(226, 232, 240, 1)'
          }}
        >
          
          {/* Sign In Header */}
          <div className="text-center mb-4">
            <h3 className="fw-bold text-primary mb-1">Sign In</h3>
            <p className="text-muted small">Enter your credentials to access your account</p>
          </div>

          {error && <div className="alert alert-danger py-2">{error}</div>}
          {success && <div className="alert alert-success py-2">{success}</div>}

          <form onSubmit={handleAction}>
            {isRegister && (
              <div className="mb-3">
                <label className="form-label fw-semibold text-secondary small mb-1.5" style={{ letterSpacing: '0.5px', fontSize: '0.85rem' }}>Full Name</label>
                <input 
                  type="text" 
                  className="form-control login-input" 
                  style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '0.95rem' }}
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  required 
                />
              </div>
            )}

            <div className="mb-3">
              <label className="form-label fw-semibold text-secondary small mb-1.5" style={{ letterSpacing: '0.5px', fontSize: '0.85rem' }}>Email Address</label>
              <input 
                type="email" 
                className="form-control login-input" 
                style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '0.95rem' }}
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="name@example.com"
                required 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold text-secondary small mb-1.5" style={{ letterSpacing: '0.5px', fontSize: '0.85rem' }}>Password</label>
              <div className="position-relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="form-control login-input" 
                  style={{ borderRadius: '12px', padding: '12px 48px 12px 16px', fontSize: '0.95rem' }}
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••"
                  required 
                />
                <button
                  type="button"
                  className="btn position-absolute end-0 top-50 translate-middle-y border-0 text-secondary px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'transparent', zIndex: 10, display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
            </div>

            {isRegister && (
              <>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small mb-1.5" style={{ letterSpacing: '0.5px', fontSize: '0.85rem' }}>Role Profile</label>
                  <select 
                    className="form-select login-input" 
                    style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '0.95rem' }}
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
                      <label className="form-label fw-semibold text-secondary small mb-1.5" style={{ letterSpacing: '0.5px', fontSize: '0.85rem' }}>Roll Number</label>
                      <input 
                        type="text" 
                        className="form-control login-input" 
                        style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '0.95rem' }}
                        value={rollNumber} 
                        onChange={(e) => setRollNumber(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="col-6 mb-3">
                      <label className="form-label fw-semibold text-secondary small mb-1.5" style={{ letterSpacing: '0.5px', fontSize: '0.85rem' }}>Class/Section</label>
                      <input 
                        type="text" 
                        className="form-control login-input" 
                        style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '0.95rem' }}
                        value={classSection} 
                        onChange={(e) => setClassSection(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-secondary small mb-1.5" style={{ letterSpacing: '0.5px', fontSize: '0.85rem' }}>Department Name</label>
                    <input 
                      type="text" 
                      className="form-control login-input" 
                      style={{ borderRadius: '12px', padding: '12px 16px', fontSize: '0.95rem' }}
                      value={department} 
                      onChange={(e) => setDepartment(e.target.value)} 
                      required 
                    />
                  </div>
                )}
              </>
            )}

            <button 
              type="submit" 
              className="btn btn-primary w-100 py-2.5 d-flex align-items-center justify-content-center gap-2 mt-4 fw-bold shadow-sm"
              style={{ borderRadius: '12px', fontSize: '1rem', letterSpacing: '0.5px' }}
            >
              {isRegister ? <FaUserPlus /> : <FaSignInAlt />}
              {isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="text-center mt-4 text-muted small" style={{ fontSize: '0.8rem', letterSpacing: '0.5px', opacity: 0.7 }}>
          developed by @buddhadev deep and @manav delvadiya
        </div>
      </div>
    </div>
  );
};

export default Login;


