import API_BASE from '../config/api.js';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { FaUserCheck, FaUserSlash, FaUserPlus, FaEdit, FaTrash, FaUserGraduate } from 'react-icons/fa';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  
  const [formData, setFormData] = useState({
    email: '', password: '', fullName: '', rollNumber: '', classSection: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const redirectTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/teacher/students`);
      setStudents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const toggleStatus = async (userId, currentStatus) => {
    try {
      await axios.put(`${API_BASE}/api/teacher/students/${userId}/status`, { is_active: currentStatus ? 0 : 1 });
      fetchStudents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to delete student "${name}"? This action cannot be undone.`)) return;
    try {
      await axios.delete(`${API_BASE}/api/teacher/students/${userId}`);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting student.');
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({ email: '', password: '', fullName: '', rollNumber: '', classSection: '' });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleOpenEdit = (student) => {
    setIsEditing(true);
    setEditingUserId(student.user_id);
    setFormData({
      email: student.email,
      password: '', // Keep empty unless updating
      fullName: student.full_name,
      rollNumber: student.roll_number,
      classSection: student.class_section
    });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (isEditing) {
        await axios.put(`${API_BASE}/api/teacher/students/${editingUserId}`, formData);
        setSuccess('Student updated successfully!');
      } else {
        const rollNumbers = formData.rollNumber.split(',').map(r => r.trim()).filter(Boolean);
        if (rollNumbers.length > 1) {
          const [emailPrefix, emailDomain] = formData.email.split('@');
          const results = await Promise.allSettled(rollNumbers.map(rollNum => {
            const generatedEmail = `${emailPrefix}_${rollNum}@${emailDomain}`;
            const generatedFullName = `${formData.fullName} (${rollNum})`;
            return axios.post(`${API_BASE}/api/teacher/students`, {
              ...formData,
              rollNumber: rollNum,
              email: generatedEmail,
              fullName: generatedFullName
            });
          }));

          const successes = results.filter(r => r.status === 'fulfilled');
          const failures = results.filter(r => r.status === 'rejected');

          if (failures.length > 0) {
            const errorMessages = failures.map(f => {
              const errObj = f.reason;
              return errObj.response?.data?.message || errObj.message || 'Unknown error';
            });
            setError(`Registered ${successes.length} students, but ${failures.length} failed: ${Array.from(new Set(errorMessages)).join(', ')}`);
          } else {
            setSuccess(`Successfully registered all ${rollNumbers.length} students!`);
          }
        } else {
          await axios.post(`${API_BASE}/api/teacher/students`, formData);
          setSuccess('Student registered successfully!');
        }
      }
      redirectTimeoutRef.current = setTimeout(() => {
        setShowModal(false);
        fetchStudents();
      }, 1500);
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(err.response.data.errors.map(x => x.msg).join(', '));
      } else {
        setError(err.response?.data?.message || err.message || 'Action failed.');
      }
    }
  };

  if (loading) return <div className="container mt-4"><div className="skeleton-line" /></div>;

  return (
    <div className="container mt-4 animated-fade">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <h3 className="fw-bold text-gradient mb-0">Student Enrollment & Directory</h3>
        <button className="btn btn-primary d-flex align-items-center gap-2 shadow" onClick={handleOpenAdd} style={{ width: 'fit-content' }}>
          <FaUserPlus /> Register New Student
        </button>
      </div>

      <div className="card glass-card p-4 shadow">
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Email Address</th>
                <th>Roll Number</th>
                <th>Class / Section</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.user_id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <FaUserGraduate className="text-secondary" />
                      <strong>{s.full_name}</strong>
                    </div>
                  </td>
                  <td>{s.email}</td>
                  <td><span className="badge bg-secondary">{s.roll_number}</span></td>
                  <td><span className="badge bg-light text-dark border">{s.class_section}</span></td>
                  <td>
                    <span className={`status-badge ${s.is_active ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                      {s.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleOpenEdit(s)}
                      >
                        <FaEdit /> Edit
                      </button>
                      <button 
                        className={`btn btn-sm ${s.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                        onClick={() => toggleStatus(s.user_id, s.is_active)}
                      >
                        {s.is_active ? <FaUserSlash /> : <FaUserCheck />} {s.is_active ? 'Suspend' : 'Activate'}
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(s.user_id, s.full_name)}
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    No students found. Click "Register New Student" to enroll.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && createPortal(
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-card p-3 shadow-lg border-primary">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold text-primary">
                  {isEditing ? 'Edit Student Details' : 'Register New Student'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2 small">{error}</div>}
                  {success && <div className="alert alert-success py-2 small">{success}</div>}

                  <div className="mb-3">
                    <label className="form-label small fw-bold">Full Name</label>
                    <input 
                      type="text" className="form-control" required
                      value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} 
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Email Address</label>
                    <input 
                      type="email" className="form-control" required
                      value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                      placeholder="e.g. john@gmail.com"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">
                      Password {isEditing && <span className="text-muted">(leave empty to keep unchanged)</span>}
                    </label>
                    <input 
                      type="password" className="form-control" required={!isEditing}
                      value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                      placeholder={isEditing ? "Enter new password" : "At least 6 characters"}
                    />
                  </div>
                  <div className="row">
                    <div className="col-6 mb-3">
                      <label className="form-label small fw-bold">Roll Number(s)</label>
                      <input 
                        type="text" className="form-control" required
                        value={formData.rollNumber} onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })} 
                        placeholder="e.g. 502 or 502,503,504"
                      />
                    </div>
                    <div className="col-6 mb-3">
                      <label className="form-label small fw-bold">Class Section</label>
                      <input 
                        type="text" className="form-control" required
                        value={formData.classSection} onChange={(e) => setFormData({ ...formData, classSection: e.target.value })} 
                        placeholder="e.g. CSE-A"
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
                  <button type="submit" className="btn btn-primary shadow">Save changes</button>
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

export default StudentManagement;
