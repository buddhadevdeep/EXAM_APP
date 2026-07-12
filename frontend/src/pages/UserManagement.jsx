import API_BASE from '../config/api.js';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { FaUserShield, FaUserCheck, FaUserSlash, FaUserPlus } from 'react-icons/fa';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '', password: '', roleId: 3, fullName: '', rollNumber: '', classSection: '', department: ''
  });

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/users`);
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleStatus = async (userId, currentStatus) => {
    try {
      await axios.put(`${API_BASE}/api/admin/users/${userId}/status`, { is_active: currentStatus ? 0 : 1 });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/auth/register`, formData);
      setShowModal(false);
      setFormData({ email: '', password: '', roleId: 3, fullName: '', rollNumber: '', classSection: '', department: '' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error registering user.');
    }
  };

  if (loading) return <div className="container mt-4"><div className="skeleton-line" /></div>;

  return (
    <div className="container mt-4 animated-fade">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <h3 className="fw-bold mb-0">Manage Platform Users</h3>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowModal(true)} style={{ width: 'fit-content' }}>
          <FaUserPlus /> Add Teacher / Student
        </button>
      </div>

      <div className="card glass-card p-4">
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Verification</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.full_name}</strong></td>
                  <td>{u.email}</td>
                  <td><span className="badge bg-primary">{u.role_name}</span></td>
                  <td>
                    <span className={`badge ${u.email_verified ? 'bg-success' : 'bg-warning'}`}>
                      {u.email_verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${u.is_active ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                      {u.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className={`btn btn-sm ${u.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                      onClick={() => toggleStatus(u.id, u.is_active)}
                    >
                      {u.is_active ? <FaUserSlash /> : <FaUserCheck />} {u.is_active ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && createPortal(
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-card p-3">
               <div className="modal-header border-0">
                <h5 className="modal-title fw-bold text-primary">Register Account</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleRegister}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text" className="form-control" required
                      value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} 
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input 
                      type="email" className="form-control" required
                      value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input 
                      type="password" className="form-control" required
                      value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Role</label>
                    <select 
                      className="form-select" value={formData.roleId} 
                      onChange={(e) => setFormData({ ...formData, roleId: parseInt(e.target.value) })}
                    >
                      <option value={3}>Student</option>
                      <option value={2}>Teacher</option>
                    </select>
                  </div>
                  {formData.roleId === 3 ? (
                    <>
                      <div className="mb-3">
                        <label className="form-label">Roll Number</label>
                        <input 
                          type="text" className="form-control" required
                          value={formData.rollNumber} onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })} 
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Class Section</label>
                        <input 
                          type="text" className="form-control" required
                          value={formData.classSection} onChange={(e) => setFormData({ ...formData, classSection: e.target.value })} 
                        />
                      </div>
                    </>
                  ) : (
                    <div className="mb-3">
                      <label className="form-label">Department</label>
                      <input 
                        type="text" className="form-control" required
                        value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} 
                      />
                    </div>
                  )}
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
                  <button type="submit" className="btn btn-primary">Save changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default UserManagement;


