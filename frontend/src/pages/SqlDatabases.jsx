import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE from '../config/api';
import { 
  FaDatabase, FaPlus, FaTrash, FaEdit, FaSave, FaTimes, 
  FaInfoCircle, FaColumns, FaTable, FaEye, FaCode, FaCheck 
} from 'react-icons/fa';

const SqlDatabases = () => {
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editDbId, setEditDbId] = useState(null);

  // Form states
  const [dbName, setDbName] = useState('');
  const [dbDescription, setDbDescription] = useState('');
  const [tables, setTables] = useState([]);

  // Active viewing state (Modal or Drawer)
  const [viewingDb, setViewingDb] = useState(null);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchDatabases();
  }, []);

  const fetchDatabases = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/sql-practice/databases`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDatabases(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load SQL databases.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setDbName('');
    setDbDescription('');
    setTables([
      {
        name: 'employees',
        columns: [
          { name: 'id', type: 'INT', is_primary: true, is_foreign: false, foreign_table: '', foreign_column: '' },
          { name: 'name', type: 'VARCHAR(50)', is_primary: false, is_foreign: false, foreign_table: '', foreign_column: '' },
          { name: 'salary', type: 'DECIMAL(10,2)', is_primary: false, is_foreign: false, foreign_table: '', foreign_column: '' }
        ],
        rowsRaw: '[\n  {"id": 1, "name": "Alice Jones", "salary": 80000.00},\n  {"id": 2, "name": "Bob Vance", "salary": 55000.00}\n]'
      }
    ]);
    setEditDbId(null);
    setIsEditing(true);
    setMessage('');
    setErrorMsg('');
  };

  const handleOpenEdit = (db) => {
    setDbName(db.name);
    setDbDescription(db.description);
    setTables(
      db.tables.map(t => ({
        name: t.name,
        columns: t.columns.map(c => ({
          name: c.name,
          type: c.type,
          is_primary: c.is_primary,
          is_foreign: c.is_foreign,
          foreign_table: c.foreign_table || '',
          foreign_column: c.foreign_column || ''
        })),
        rowsRaw: JSON.stringify(t.rows, null, 2)
      }))
    );
    setEditDbId(db._id);
    setIsEditing(true);
    setMessage('');
    setErrorMsg('');
  };

  const handleAddTable = () => {
    setTables([
      ...tables,
      {
        name: `table_${tables.length + 1}`,
        columns: [{ name: 'id', type: 'INT', is_primary: true, is_foreign: false, foreign_table: '', foreign_column: '' }],
        rowsRaw: '[\n  {"id": 1}\n]'
      }
    ]);
  };

  const handleRemoveTable = (tIdx) => {
    setTables(tables.filter((_, idx) => idx !== tIdx));
  };

  const handleTableChange = (tIdx, field, val) => {
    const updated = [...tables];
    updated[tIdx][field] = val;
    setTables(updated);
  };

  const handleAddColumn = (tIdx) => {
    const updated = [...tables];
    updated[tIdx].columns.push({
      name: '',
      type: 'INT',
      is_primary: false,
      is_foreign: false,
      foreign_table: '',
      foreign_column: ''
    });
    setTables(updated);
  };

  const handleRemoveColumn = (tIdx, cIdx) => {
    const updated = [...tables];
    updated[tIdx].columns = updated[tIdx].columns.filter((_, idx) => idx !== cIdx);
    setTables(updated);
  };

  const handleColumnChange = (tIdx, cIdx, field, val) => {
    const updated = [...tables];
    updated[tIdx].columns[cIdx][field] = val;
    setTables(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');
    setErrorMsg('');

    if (!dbName.trim()) {
      setErrorMsg('Database Name is required.');
      return;
    }

    // Validate table JSON rows
    const parsedTables = [];
    for (let i = 0; i < tables.length; i++) {
      const t = tables[i];
      if (!t.name.trim()) {
        setErrorMsg(`Table #${i + 1} requires a name.`);
        return;
      }
      
      // Validate columns
      for (let j = 0; j < t.columns.length; j++) {
        if (!t.columns[j].name.trim()) {
          setErrorMsg(`Column #${j + 1} in table "${t.name}" requires a name.`);
          return;
        }
      }

      let parsedRows = [];
      try {
        if (t.rowsRaw && t.rowsRaw.trim()) {
          parsedRows = JSON.parse(t.rowsRaw);
          if (!Array.isArray(parsedRows)) {
            setErrorMsg(`Sample data in table "${t.name}" must be a JSON Array of objects.`);
            return;
          }
        }
      } catch (err) {
        setErrorMsg(`Invalid JSON data in table "${t.name}": ` + err.message);
        return;
      }

      parsedTables.push({
        name: t.name.trim(),
        columns: t.columns.map(c => ({
          name: c.name.trim(),
          type: c.type,
          is_primary: !!c.is_primary,
          is_foreign: !!c.is_foreign,
          foreign_table: c.is_foreign ? c.foreign_table.trim() : null,
          foreign_column: c.is_foreign ? c.foreign_column.trim() : null
        })),
        rows: parsedRows
      });
    }

    try {
      const payload = { name: dbName.trim(), description: dbDescription.trim(), tables: parsedTables };
      
      if (editDbId) {
        await axios.put(`${API_BASE}/api/sql-practice/databases/${editDbId}`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMessage('SQL Database updated successfully!');
      } else {
        await axios.post(`${API_BASE}/api/sql-practice/databases`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMessage('SQL Database created successfully!');
      }
      
      setIsEditing(false);
      fetchDatabases();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Error saving database.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this database? Any linked assignments will prevent deletion.')) return;
    try {
      await axios.delete(`${API_BASE}/api/sql-practice/databases/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage('Database deleted.');
      fetchDatabases();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete database.');
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1 text-primary d-flex align-items-center gap-2">
            <FaDatabase /> SQL Databases
          </h2>
          <p className="text-muted mb-0">Create schemas and manage sandbox relational tables for practice assignments.</p>
        </div>
        {!isEditing && (
          <button className="btn btn-primary d-flex align-items-center gap-2 fw-bold" onClick={handleOpenCreate}>
            <FaPlus /> Custom Database
          </button>
        )}
      </div>

      {message && <div className="alert alert-success py-2">{message}</div>}
      {errorMsg && <div className="alert alert-danger py-2">{errorMsg}</div>}

      {isEditing ? (
        <div className="card glass-card p-4 shadow border border-secondary border-opacity-15 rounded-4">
          <h4 className="fw-bold mb-4 text-primary d-flex align-items-center gap-2">
            {editDbId ? <FaEdit /> : <FaPlus />} {editDbId ? 'Edit SQL Database Schema' : 'Create Custom Database'}
          </h4>

          <form onSubmit={handleSave}>
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label text-muted small fw-bold text-uppercase">Database Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={dbName} 
                  onChange={(e) => setDbName(e.target.value)} 
                  placeholder="e.g. LibraryDB" 
                  required 
                />
              </div>
              <div className="col-md-6">
                <label className="form-label text-muted small fw-bold text-uppercase">Description</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={dbDescription} 
                  onChange={(e) => setDbDescription(e.target.value)} 
                  placeholder="Relational schema managing books, authors, and rentals." 
                />
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-20 pb-2 mb-4">
              <h5 className="fw-bold text-info mb-0 d-flex align-items-center gap-2">
                <FaTable /> Table Definitions ({tables.length})
              </h5>
              <button type="button" className="btn btn-sm btn-outline-info d-flex align-items-center gap-1" onClick={handleAddTable}>
                <FaPlus /> Add Table
              </button>
            </div>

            {tables.map((table, tIdx) => (
              <div key={tIdx} className="card glass-card p-3 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="d-flex align-items-center gap-3">
                    <span className="badge bg-secondary">Table #{tIdx + 1}</span>
                    <input 
                      type="text" 
                      className="form-control form-control-sm fw-bold border-info" 
                      style={{ maxWidth: '200px' }}
                      value={table.name} 
                      onChange={(e) => handleTableChange(tIdx, 'name', e.target.value)} 
                      placeholder="table_name" 
                      required 
                    />
                  </div>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveTable(tIdx)}>
                    <FaTrash /> Remove Table
                  </button>
                </div>

                <div className="row g-3">
                  {/* Columns Section */}
                  <div className="col-lg-7">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted small fw-bold text-uppercase">Columns</span>
                      <button type="button" className="btn btn-xs btn-outline-secondary py-0 px-2" style={{ fontSize: '0.75rem' }} onClick={() => handleAddColumn(tIdx)}>
                        + Add Column
                      </button>
                    </div>
                    
                    <div className="table-responsive">
                      <table className="table table-sm align-middle small mb-0 font-monospace">
                        <thead>
                          <tr>
                            <th>Column Name</th>
                            <th>Data Type</th>
                            <th className="text-center">PK</th>
                            <th className="text-center">FK</th>
                            <th>FK Target Table / Column</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {table.columns.map((col, cIdx) => (
                            <tr key={cIdx}>
                              <td>
                                <input 
                                  type="text" 
                                  className="form-control form-control-xs font-monospace" 
                                  value={col.name} 
                                  onChange={(e) => handleColumnChange(tIdx, cIdx, 'name', e.target.value)} 
                                  placeholder="id" 
                                />
                              </td>
                              <td>
                                <select 
                                  className="form-select form-select-xs"
                                  value={col.type}
                                  onChange={(e) => handleColumnChange(tIdx, cIdx, 'type', e.target.value)}
                                >
                                  <option value="INT">INT</option>
                                  <option value="VARCHAR(50)">VARCHAR(50)</option>
                                  <option value="VARCHAR(100)">VARCHAR(100)</option>
                                  <option value="VARCHAR(255)">VARCHAR(255)</option>
                                  <option value="TEXT">TEXT</option>
                                  <option value="DECIMAL(10,2)">DECIMAL(10,2)</option>
                                  <option value="DATE">DATE</option>
                                  <option value="TIMESTAMP">TIMESTAMP</option>
                                </select>
                              </td>
                              <td className="text-center">
                                <input 
                                  type="checkbox" 
                                  checked={col.is_primary} 
                                  onChange={(e) => handleColumnChange(tIdx, cIdx, 'is_primary', e.target.checked)} 
                                />
                              </td>
                              <td className="text-center">
                                <input 
                                  type="checkbox" 
                                  checked={col.is_foreign} 
                                  onChange={(e) => handleColumnChange(tIdx, cIdx, 'is_foreign', e.target.checked)} 
                                />
                              </td>
                              <td>
                                {col.is_foreign && (
                                  <div className="d-flex gap-1">
                                    <input 
                                      type="text" 
                                      className="form-control form-control-xs small" 
                                      value={col.foreign_table} 
                                      onChange={(e) => handleColumnChange(tIdx, cIdx, 'foreign_table', e.target.value)} 
                                      placeholder="tbl" 
                                    />
                                    <input 
                                      type="text" 
                                      className="form-control form-control-xs small" 
                                      value={col.foreign_column} 
                                      onChange={(e) => handleColumnChange(tIdx, cIdx, 'foreign_column', e.target.value)} 
                                      placeholder="col" 
                                    />
                                  </div>
                                )}
                              </td>
                              <td className="text-end">
                                <button type="button" className="btn btn-link text-danger p-0" onClick={() => handleRemoveColumn(tIdx, cIdx)}>
                                  <FaTimes />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Seed Data Section */}
                  <div className="col-lg-5">
                    <label className="form-label text-muted small fw-bold text-uppercase d-flex align-items-center justify-content-between">
                      <span>Sample Data (JSON Array)</span>
                      <FaCode className="text-info" />
                    </label>
                    <textarea 
                      className="form-control font-monospace small" 
                      rows={5}
                      value={table.rowsRaw}
                      onChange={(e) => handleTableChange(tIdx, 'rowsRaw', e.target.value)}
                      placeholder='[{"id": 1, "col1": "val1"}]'
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="d-flex gap-3 justify-content-end mt-4">
              <button type="submit" className="btn btn-success px-4 d-flex align-items-center gap-2 fw-bold shadow">
                <FaSave /> {editDbId ? 'Save Updates' : 'Publish Database'}
              </button>
              <button type="button" className="btn btn-outline-secondary px-4 fw-bold" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="row g-4">
          {/* List Section */}
          <div className={`${viewingDb ? 'col-lg-6' : 'col-12'}`}>
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status" />
              </div>
            ) : databases.length === 0 ? (
              <div className="card glass-card p-5 text-center text-muted">
                <FaDatabase className="fs-1 mb-3 text-warning" />
                <p className="mb-0">No custom databases created yet. Get started by clicking "Custom Database" above!</p>
              </div>
            ) : (
              <div className="row g-3">
                {databases.map(db => (
                  <div key={db._id} className="col-12">
                    <div className="card glass-card p-3 border border-secondary border-opacity-10 hover-pulse shadow">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h5 className="fw-bold mb-1 text-info d-flex align-items-center gap-2">
                            <FaDatabase /> {db.name}
                          </h5>
                          <p className="text-muted small mb-2">{db.description || 'No description provided.'}</p>
                          <div className="d-flex gap-2">
                            <span className="badge bg-secondary">{db.tables.length} tables</span>
                            <span className="badge bg-dark border border-secondary border-opacity-40">ID: #{db._id}</span>
                          </div>
                        </div>

                        <div className="d-flex gap-2">
                          <button className="btn btn-xs btn-outline-primary py-1 px-2" onClick={() => setViewingDb(db)}>
                            <FaEye /> View
                          </button>
                          <button className="btn btn-xs btn-outline-info py-1 px-2" onClick={() => handleOpenEdit(db)}>
                            <FaEdit /> Edit
                          </button>
                          <button className="btn btn-xs btn-outline-danger py-1 px-2" onClick={() => handleDelete(db._id)}>
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Viewer Section */}
          {viewingDb && (
            <div className="col-lg-6">
              <div className="card glass-card p-4 border border-info border-opacity-25 shadow-lg position-sticky" style={{ top: '20px' }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4 className="fw-bold text-info mb-0 d-flex align-items-center gap-2">
                    <FaEye /> Visualization: {viewingDb.name}
                  </h4>
                  <button className="btn btn-sm btn-link text-muted p-0" onClick={() => setViewingDb(null)}>
                    Close
                  </button>
                </div>

                {viewingDb.tables.map((table, tIdx) => (
                  <div key={tIdx} className="mb-4 p-3 rounded glass-card">
                    <h6 className="fw-bold text-primary mb-2 d-flex align-items-center gap-2">
                       <FaTable /> {table.name}
                      <span className="badge bg-secondary font-monospace small" style={{ fontSize: '0.65rem' }}>{table.rows.length} rows</span>
                    </h6>
                    
                    <div className="table-responsive mb-3 rounded border border-secondary border-opacity-10">
                      <table className="table table-sm font-monospace align-middle mb-0" style={{ fontSize: '0.75rem' }}>
                        <thead className="table-secondary bg-opacity-25 header-dark">
                          <tr>
                            <th>Column</th>
                            <th>Type</th>
                            <th>Key</th>
                          </tr>
                        </thead>
                        <tbody>
                          {table.columns.map((c, cIdx) => (
                            <tr key={cIdx}>
                              <td>{c.name}</td>
                              <td className="text-muted">{c.type}</td>
                              <td>
                                {c.is_primary && <span className="badge bg-warning text-dark small" style={{ fontSize: '0.6rem' }}>PK</span>}
                                {c.is_foreign && <span className="badge bg-info text-dark small ms-1" style={{ fontSize: '0.6rem' }}>FK ({c.foreign_table}.{c.foreign_column})</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="small">
                      <span className="text-muted d-block mb-1 font-monospace">Sample Records Preview:</span>
                      {table.rows.length === 0 ? (
                        <div className="text-muted font-monospace py-1 small bg-black bg-opacity-20 p-2 rounded">No records loaded.</div>
                      ) : (
                        <pre className="p-2 bg-dark text-info rounded border border-secondary border-opacity-10 mb-0 font-monospace" style={{ maxHeight: '180px', overflowY: 'auto', fontSize: '0.7rem' }}>
                          {JSON.stringify(table.rows, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SqlDatabases;
