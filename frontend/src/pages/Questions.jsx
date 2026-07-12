import API_BASE from '../config/api.js';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaPlus, FaSave } from 'react-icons/fa';
import MonacoEditorWrapper from '../components/MonacoEditorWrapper';

const Questions = () => {
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    questionBankId: '', categoryId: '', subjectId: '', title: '', description: '', points: 10, sqlTemplate: ''
  });

  const fetchData = async () => {
    try {
      const [qRes, sRes, cRes, bRes] = await Promise.all([
        axios.get(`${API_BASE}/api/shared/questions`),
        axios.get(`${API_BASE}/api/shared/subjects`),
        axios.get(`${API_BASE}/api/shared/categories`),
        axios.get(`${API_BASE}/api/shared/question-banks`)
      ]);
      setQuestions(qRes.data);
      setSubjects(sRes.data);
      setCategories(cRes.data);
      setBanks(bRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (!formData.questionBankId || !formData.categoryId || !formData.subjectId) {
      alert('Please select all required relation dropdowns');
      return;
    }
    try {
      await axios.post(`${API_BASE}/api/shared/questions`, formData);
      setShowModal(false);
      setFormData({ questionBankId: '', categoryId: '', subjectId: '', title: '', description: '', points: 10, sqlTemplate: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating question.');
    }
  };

  return (
    <div className="container mt-4 animated-fade">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <h3 className="fw-bold mb-0">Platform Question Bank</h3>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowModal(true)} style={{ width: 'fit-content' }}>
          <FaPlus /> Create Question
        </button>
      </div>

      <div className="card glass-card p-4">
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Title</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Bank</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id}>
                  <td>
                    <strong>{q.title}</strong>
                    <div className="text-muted small text-truncate" style={{ maxWidth: '300px' }}>{q.description}</div>
                  </td>
                  <td>{q.subject_name}</td>
                  <td><span className="badge bg-info">{q.category_name}</span></td>
                  <td>{q.question_bank_name}</td>
                  <td><span className="badge bg-success">{q.points} pts</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content glass-card p-3" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Create SQL Question</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleCreateQuestion}>
                <div className="modal-body">
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="form-label">Subject</label>
                      <select 
                        className="form-select" required value={formData.subjectId}
                        onChange={e => setFormData({ ...formData, subjectId: parseInt(e.target.value) })}
                      >
                        <option value="">Select Subject</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Category</label>
                      <select 
                        className="form-select" required value={formData.categoryId}
                        onChange={e => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}
                      >
                        <option value="">Select Category</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Question Bank</label>
                      <select 
                        className="form-select" required value={formData.questionBankId}
                        onChange={e => setFormData({ ...formData, questionBankId: parseInt(e.target.value) })}
                      >
                        <option value="">Select Bank</option>
                        {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Question Title</label>
                    <input 
                      type="text" className="form-control" required value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })} 
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Problem Description</label>
                    <textarea 
                      className="form-control" rows="3" required value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Points</label>
                    <input 
                      type="number" className="form-control" required value={formData.points}
                      onChange={e => setFormData({ ...formData, points: parseInt(e.target.value) })} 
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Standard Answer SQL Solution (For Teacher View Reference)</label>
                    <MonacoEditorWrapper 
                      value={formData.sqlTemplate}
                      onChange={val => setFormData({ ...formData, sqlTemplate: val })}
                    />
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
                  <button type="submit" className="btn btn-primary d-flex align-items-center gap-1"><FaSave /> Save Question</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Questions;


