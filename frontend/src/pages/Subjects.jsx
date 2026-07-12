import API_BASE from '../config/api.js';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaBook, FaFolderOpen, FaPlus } from 'react-icons/fa';

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [banks, setBanks] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [subName, setSubName] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankDesc, setBankDesc] = useState('');
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const fetchData = async () => {
    try {
      const [sRes, bRes, cRes] = await Promise.all([
        axios.get(`${API_BASE}/api/admin/subjects`),
        axios.get(`${API_BASE}/api/admin/question-banks`),
        axios.get(`${API_BASE}/api/admin/categories`)
      ]);
      setSubjects(sRes.data);
      setBanks(bRes.data);
      setCategories(cRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/admin/subjects`, { name: subName, description: subDesc });
      setSubName(''); setSubDesc('');
      fetchData();
    } catch (err) { alert('Error creating subject'); }
  };

  const handleCreateBank = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/admin/question-banks`, { name: bankName, description: bankDesc });
      setBankName(''); setBankDesc('');
      fetchData();
    } catch (err) { alert('Error creating bank'); }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/admin/categories`, { name: catName, description: catDesc });
      setCatName(''); setCatDesc('');
      fetchData();
    } catch (err) { alert('Error creating category'); }
  };

  return (
    <div className="container mt-4 animated-fade">
      <h3 className="fw-bold mb-4">Subjects, Banks & Categories Management</h3>

      <div className="row">
        {/* Subjects Column */}
        <div className="col-md-4 mb-4">
          <div className="card glass-card p-3 h-100">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2"><FaBook /> Subjects</h5>
            <form onSubmit={handleCreateSubject} className="mb-3">
              <input 
                type="text" className="form-control mb-2" placeholder="Subject Name" required
                value={subName} onChange={e => setSubName(e.target.value)} 
              />
              <textarea 
                className="form-control mb-2" placeholder="Description" rows="2"
                value={subDesc} onChange={e => setSubDesc(e.target.value)}
              />
              <button className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-1">
                <FaPlus /> Add Subject
              </button>
            </form>
            <hr />
            <ul className="list-group list-group-flush overflow-auto" style={{ maxHeight: '300px' }}>
              {subjects.map(s => (
                <li key={s.id} className="list-group-item bg-transparent border-0 px-0">
                  <strong>{s.name}</strong>
                  <p className="text-muted small mb-0">{s.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Question Banks Column */}
        <div className="col-md-4 mb-4">
          <div className="card glass-card p-3 h-100">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2"><FaFolderOpen /> Question Banks</h5>
            <form onSubmit={handleCreateBank} className="mb-3">
              <input 
                type="text" className="form-control mb-2" placeholder="Bank Name" required
                value={bankName} onChange={e => setBankName(e.target.value)} 
              />
              <textarea 
                className="form-control mb-2" placeholder="Description" rows="2"
                value={bankDesc} onChange={e => setBankDesc(e.target.value)}
              />
              <button className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-1">
                <FaPlus /> Add Question Bank
              </button>
            </form>
            <hr />
            <ul className="list-group list-group-flush overflow-auto" style={{ maxHeight: '300px' }}>
              {banks.map(b => (
                <li key={b.id} className="list-group-item bg-transparent border-0 px-0">
                  <strong>{b.name}</strong>
                  <p className="text-muted small mb-0">{b.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Categories Column */}
        <div className="col-md-4 mb-4">
          <div className="card glass-card p-3 h-100">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2"><FaFolderOpen /> Categories</h5>
            <form onSubmit={handleCreateCategory} className="mb-3">
              <input 
                type="text" className="form-control mb-2" placeholder="Category Name" required
                value={catName} onChange={e => setCatName(e.target.value)} 
              />
              <textarea 
                className="form-control mb-2" placeholder="Description" rows="2"
                value={catDesc} onChange={e => setCatDesc(e.target.value)}
              />
              <button className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-1">
                <FaPlus /> Add Category
              </button>
            </form>
            <hr />
            <ul className="list-group list-group-flush overflow-auto" style={{ maxHeight: '300px' }}>
              {categories.map(c => (
                <li key={c.id} className="list-group-item bg-transparent border-0 px-0">
                  <strong>{c.name}</strong>
                  <p className="text-muted small mb-0">{c.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subjects;


