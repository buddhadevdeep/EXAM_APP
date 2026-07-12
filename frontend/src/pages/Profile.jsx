import API_BASE from '../config/api.js';
import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FaUserCircle, FaLock } from 'react-icons/fa';

const Profile = () => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/api/auth/change-password`, {
        currentPassword,
        newPassword
      });
      setMessage(res.data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Error changing password.');
    }
  };

  return (
    <div className="container mt-4 animated-fade">
      <h3 className="fw-bold mb-4">Account Profile</h3>

      <div className="row">
        <div className="col-md-5 mb-4">
          <div className="card glass-card p-4 text-center">
            <FaUserCircle className="fs-1 text-primary mb-3 mx-auto" style={{ width: '80px', height: '80px' }} />
            <h4 className="fw-bold mb-1">{user?.name}</h4>
            <span className="badge bg-secondary mb-3 align-self-center px-3 py-2">{user?.role}</span>
            <hr />
            <div className="text-start mt-3">
              <div className="mb-2"><strong>Email:</strong> {user?.email}</div>
              <div className="mb-2"><strong>Platform Access Status:</strong> <span className="text-success fw-bold">Active</span></div>
            </div>
          </div>
        </div>

        <div className="col-md-7 mb-4">
          <div className="card glass-card p-4">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2"><FaLock /> Update Security Credentials</h5>
            
            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handlePasswordChange}>
              <div className="mb-3">
                <label className="form-label">Current Password</label>
                <input 
                  type="password" className="form-control" required 
                  value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} 
                />
              </div>
              <div className="mb-3">
                <label className="form-label">New Password</label>
                <input 
                  type="password" className="form-control" required 
                  value={newPassword} onChange={e => setNewPassword(e.target.value)} 
                />
              </div>
              <div className="mb-4">
                <label className="form-label">Confirm New Password</label>
                <input 
                  type="password" className="form-control" required 
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} 
                />
              </div>
              <button type="submit" className="btn btn-primary w-100 py-2">Change Password</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;


