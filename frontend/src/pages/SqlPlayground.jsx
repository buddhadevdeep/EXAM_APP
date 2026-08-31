import API_BASE from '../config/api.js';
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  FaDatabase, FaPlay, FaSyncAlt, FaTrashAlt, 
  FaPlus, FaEdit, FaTimes, FaTable, FaInfoCircle, FaFileCsv 
} from 'react-icons/fa';
import MonacoEditorWrapper from '../components/MonacoEditorWrapper';
import alasql from 'alasql';
import { validateSqlQuery } from '../utils/sqlValidator';
window.alasql = alasql;
// Configure alaSQL for MS SQL functionality defaults
alasql.options.casesensitive = false;
alasql.options.tsql = true;

const DEFAULT_SCHEMAS = [
  {
    id: 'default-company',
    title: 'Company Administration Database',
    description: 'A standard staff and management schema including employees, roles, and departments.',
    schema_sql: `CREATE TABLE departments (id INT PRIMARY KEY, name VARCHAR(100), location VARCHAR(100));
INSERT INTO departments VALUES (1, 'Engineering', 'San Francisco');
INSERT INTO departments VALUES (2, 'Sales', 'New York');
INSERT INTO departments VALUES (3, 'Marketing', 'London');
INSERT INTO departments VALUES (4, 'Human Resources', 'Chicago');

CREATE TABLE employees (id INT PRIMARY KEY, name VARCHAR(100), role VARCHAR(100), salary INT, department_id INT, manager_id INT);
INSERT INTO employees VALUES (101, 'Dr. Alan Turing', 'Chief Architect', 150000, 1, NULL);
INSERT INTO employees VALUES (102, 'Prof. Grace Hopper', 'Director of Engineering', 135000, 1, 101);
INSERT INTO employees VALUES (103, 'Ada Lovelace', 'Staff Engineer', 120000, 1, 102);
INSERT INTO employees VALUES (104, 'John Doe', 'Senior Developer', 90000, 1, 103);
INSERT INTO employees VALUES (105, 'Jane Smith', 'Senior Developer', 92000, 1, 103);
INSERT INTO employees VALUES (106, 'Bob Johnson', 'VP of Sales', 110000, 2, NULL);
INSERT INTO employees VALUES (107, 'Alice Brown', 'Sales Rep', 65000, 2, 106);
INSERT INTO employees VALUES (108, 'Charlie Green', 'Marketing Manager', 85000, 3, NULL);
INSERT INTO employees VALUES (109, 'David Lee', 'HR Specialist', 70000, 4, 102);
`
  },
  {
    id: 'default-university',
    title: 'University Registration System',
    description: 'A schema tracking students, courses, enrollments, and teaching assignments.',
    schema_sql: `CREATE TABLE students (id INT PRIMARY KEY, name VARCHAR(100), major VARCHAR(100), gpa DECIMAL(3,2));
INSERT INTO students VALUES (1, 'John Miller', 'Computer Science', 3.8);
INSERT INTO students VALUES (2, 'Sarah Williams', 'Mathematics', 3.9);
INSERT INTO students VALUES (3, 'Emily Davis', 'Computer Science', 3.4);
INSERT INTO students VALUES (4, 'Michael Wilson', 'Data Science', 3.1);

CREATE TABLE courses (course_code VARCHAR(10) PRIMARY KEY, title VARCHAR(100), credits INT);
INSERT INTO courses VALUES ('CS101', 'Introduction to Computer Science', 4);
INSERT INTO courses VALUES ('CS202', 'Database Management Systems', 4);
INSERT INTO courses VALUES ('MATH150', 'Calculus I', 3);
INSERT INTO courses VALUES ('DS301', 'Introduction to Machine Learning', 4);

CREATE TABLE enrollments (student_id INT, course_code VARCHAR(10), semester VARCHAR(20), grade VARCHAR(2));
INSERT INTO enrollments VALUES (1, 'CS101', 'Fall 2025', 'A');
INSERT INTO enrollments VALUES (1, 'CS202', 'Fall 2025', 'A-');
INSERT INTO enrollments VALUES (2, 'MATH150', 'Fall 2025', 'A');
INSERT INTO enrollments VALUES (3, 'CS202', 'Fall 2025', 'B+');
INSERT INTO enrollments VALUES (4, 'DS301', 'Fall 2025', 'B');
INSERT INTO enrollments VALUES (4, 'CS101', 'Fall 2025', 'C+');
`
  }
];

const SqlPlayground = () => {
  const { user } = useAuth();
  
  // States
  const [engineReady, setEngineReady] = useState(false);
  const [engineError, setEngineError] = useState(null);
  const [schemas, setSchemas] = useState(DEFAULT_SCHEMAS);
  const [selectedSchema, setSelectedSchema] = useState(DEFAULT_SCHEMAS[0]);
  const [schemaDropdownValue, setSchemaDropdownValue] = useState(DEFAULT_SCHEMAS[0].id);
  
  const [query, setQuery] = useState('SELECT * FROM employees;');
  const [executing, setExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [executionMessage, setExecutionMessage] = useState('');
  
  // Left side Schema browser
  const [dbTables, setDbTables] = useState([]);
  
  // Teacher management modal states
  const [showManageModal, setShowManageModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [editingSchemaId, setEditingSchemaId] = useState(null);
  const [formFields, setFormFields] = useState({ title: '', description: '', schemaSql: '', assignedClass: 'All' });
  const [formError, setFormError] = useState('');

  // Active Tab in results
  const [resultsTab, setResultsTab] = useState('grid'); // 'grid' | 'message' | 'json'

  const customDbRef = useRef(null);

  // Initialize AlaSQL & load schemas
  useEffect(() => {
    try {
      setEngineReady(true);
      fetchTeacherSchemas();
    } catch (err) {
      setEngineError(err.message);
    }
  }, []);

  // When selectedSchema changes, reset in-memory database
  useEffect(() => {
    if (engineReady && selectedSchema) {
      resetDatabase();
    }
  }, [engineReady, selectedSchema]);

  const fetchTeacherSchemas = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/practice/schemas`);
      if (res.data && Array.isArray(res.data)) {
        setSchemas([...DEFAULT_SCHEMAS, ...res.data]);
      }
    } catch (err) {
      console.error('Failed to fetch user schemas:', err);
    }
  };

  const handleSchemaChange = (e) => {
    const schemaId = e.target.value;
    setSchemaDropdownValue(schemaId);
    const found = schemas.find(s => String(s.id || s._id) === String(schemaId));
    if (found) {
      setSelectedSchema(found);
      // Put default query
      if (schemaId === 'default-company') {
        setQuery('SELECT * FROM employees;');
      } else if (schemaId === 'default-university') {
        setQuery('SELECT * FROM students;');
      } else {
        setQuery('-- Write your queries here\nSELECT * FROM sqlite_master WHERE type="table";');
      }
    }
  };

  const resetDatabase = () => {
    if (!window.alasql || !selectedSchema) return;
    try {
      // Create a brand new clean database context
      const dbId = 'practice_db_' + Math.random().toString(36).substring(2, 9);
      window.alasql(`CREATE DATABASE IF NOT EXISTS ${dbId}; USE ${dbId};`);
      customDbRef.current = dbId;
      
      // Execute DDL/DML statements
      const statements = selectedSchema.schema_sql || selectedSchema.schemaSql || '';
      // Split by semicolon, filter out empty, run
      const splitStmts = statements
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const stmt of splitStmts) {
        const stmtLower = stmt.toLowerCase().trim();
        let processedStmt = stmt;
        if (stmtLower.startsWith('create table ') && !stmtLower.startsWith('create table if not exists')) {
          processedStmt = stmt.replace(/create\s+table/i, 'CREATE TABLE IF NOT EXISTS');
        } else if (stmtLower.startsWith('create database ') && !stmtLower.startsWith('create database if not exists')) {
          processedStmt = stmt.replace(/create\s+database/i, 'CREATE DATABASE IF NOT EXISTS');
        }
        window.alasql(processedStmt);
      }

      setQueryResult(null);
      setQueryError(null);
      setExecutionMessage('Database schema initialized and loaded successfully.');
      updateSchemaBrowser();
    } catch (err) {
      setQueryError('Initialization Error: ' + err.message);
      setDbTables([]);
    }
  };

  const updateSchemaBrowser = () => {
    if (!window.alasql) return;
    try {
      // Find all custom tables
      const tablesObj = window.alasql.databases[window.alasql.useid].tables;
      const tablesList = [];
      
      for (const name in tablesObj) {
        // Query columns or get directly
        const columns = tablesObj[name].columns || [];
        const columnsMapped = columns.map(c => ({
          name: c.columnid,
          type: c.dbtype || 'VARCHAR'
        }));

        // If columns array is empty (e.g. dynamic insert), inspect first record
        if (columnsMapped.length === 0) {
          const sample = window.alasql(`SELECT * FROM ${name} LIMIT 1`);
          if (sample && sample[0]) {
            Object.keys(sample[0]).forEach(key => {
              columnsMapped.push({ name: key, type: 'UNKNOWN' });
            });
          }
        }

        tablesList.push({
          name: name,
          columns: columnsMapped
        });
      }
      setDbTables(tablesList);
    } catch (err) {
      console.error('Error fetching tables schema:', err);
    }
  };

  const runQuery = () => {
    if (!window.alasql) return;
    setExecuting(true);
    setQueryResult(null);
    setQueryError(null);
    
    // Tiny delay to animate loader
    setTimeout(() => {
      try {
        // Multi query handler: split queries by semicolon
        const splitQueries = query
          .split(';')
          .map(q => q.trim())
          .filter(q => q.length > 0);

        if (splitQueries.length === 0) {
          setQueryError('No query statements found.');
          setExecuting(false);
          return;
        }

        let res = null;
        for (const idx in splitQueries) {
          validateSqlQuery(splitQueries[idx]);
          res = window.alasql(splitQueries[idx]);
        }

        // Check if query is SELECT returning dataset
        if (Array.isArray(res)) {
          setQueryResult(res);
          setResultsTab('grid');
          setExecutionMessage(`Query executed successfully. ${res.length} rows returned.`);
        } else {
          // INSERT, UPDATE, DDL etc. return integer counts
          setQueryResult([]);
          setResultsTab('message');
          setExecutionMessage(`Success. Command executed. Result: ${JSON.stringify(res)}`);
        }
        
        // Refresh tables if schema changed (e.g. helper ran CREATE TABLE or DROP)
        updateSchemaBrowser();
      } catch (err) {
        setQueryError(err.message);
        setResultsTab('message');
      } finally {
        setExecuting(false);
      }
    }, 150);
  };

  // Manage Schema actions
  const openManageModal = () => {
    setShowManageModal(true);
  };

  const openCreateForm = () => {
    setFormFields({ title: '', description: '', schemaSql: '', assignedClass: 'All' });
    setFormError('');
    setFormMode('create');
    setShowFormModal(true);
  };

  const openEditForm = (schema) => {
    const sql = schema.schema_sql || schema.schemaSql || '';
    setFormFields({
      title: schema.title,
      description: schema.description,
      schemaSql: sql,
      assignedClass: schema.assigned_class || schema.assignedClass || 'All'
    });
    setFormError('');
    setFormMode('edit');
    setEditingSchemaId(schema._id || schema.id);
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      if (formMode === 'create') {
        const res = await axios.post(`${API_BASE}/api/practice/schemas`, formFields);
        const newSchema = res.data.schema;
        setSchemas([...schemas, { ...newSchema, id: newSchema._id }]);
        alert('Practice assignment created successfully!');
      } else {
        await axios.put(`${API_BASE}/api/practice/schemas/${editingSchemaId}`, formFields);
        alert('Practice assignment updated successfully!');
        fetchTeacherSchemas();
      }
      setShowFormModal(false);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error occurred while saving schema.');
    }
  };

  const deleteSchema = async (schemaId) => {
    if (!window.confirm('Are you sure you want to delete this practice schema?')) return;
    try {
      await axios.delete(`${API_BASE}/api/practice/schemas/${schemaId}`);
      alert('Schema deleted successfully.');
      
      // If active schema is deleted, fallback to default-company
      if (String(selectedSchema.id || selectedSchema._id) === String(schemaId)) {
        setSelectedSchema(DEFAULT_SCHEMAS[0]);
        setSchemaDropdownValue(DEFAULT_SCHEMAS[0].id);
      }
      
      fetchTeacherSchemas();
    } catch (err) {
      alert('Failed to delete schema: ' + (err.response?.data?.message || err.message));
    }
  };

  // Export results grid to CSV
  const exportCSV = () => {
    if (!queryResult || queryResult.length === 0) return;
    const headers = Object.keys(queryResult[0]).join(',');
    const rows = queryResult.map(row => 
      Object.values(row).map(val => {
        const strVal = String(val === null || val === undefined ? '' : val);
        return strVal.includes(',') ? `"${strVal.replace(/"/g, '""')}"` : strVal;
      }).join(',')
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sql_result_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (engineError) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <h4 className="alert-heading fw-bold">SQL Engine Inoperable!</h4>
          <p className="mb-0">{engineError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-3 px-md-4 animated-fade">
      {/* Header bar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <FaDatabase className="text-primary" /> SQL Practice Assignments
          </h3>
          <p className="text-muted mb-0 small">
            Solve SQL challenges and test queries against instructor-designed database schemas.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {user?.role === 'Teacher' && (
            <button className="btn btn-outline-primary fw-bold" onClick={openManageModal}>
              Manage SQL Assignments
            </button>
          )}
          <button className="btn btn-warning fw-bold d-flex align-items-center gap-2" onClick={resetDatabase}>
            <FaSyncAlt /> Reset Active DB
          </button>
        </div>
      </div>

      <div className="row">
        {/* Left column: Schema navigator & database browser */}
        <div className="col-lg-3 mb-4">
          <div className="card glass-card p-3 h-100 shadow-sm border border-secondary border-opacity-10 d-flex flex-column" style={{ minHeight: '500px' }}>
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 border-bottom pb-2">
              <FaTable size={18} className="text-success" /> Active Database Schema
            </h5>

            <div className="mb-3">
              <label className="form-label small fw-bold text-muted">Select SQL Practice Assignment</label>
              <select className="form-select" value={schemaDropdownValue} onChange={handleSchemaChange}>
                {schemas.map(s => (
                  <option key={s.id || s._id} value={s.id || s._id}>
                    {s.title} {s.id === 'default-company' || s.id === 'default-university' ? '(Default Sandbox)' : `(Class: ${s.assigned_class || 'All'})`}
                  </option>
                ))}
              </select>
              <div className="small text-muted mt-2 border-bottom pb-3">
                {selectedSchema?.description}
              </div>
            </div>

            <div className="flex-grow-1 overflow-auto" style={{ maxHeight: '400px' }}>
              <div className="fw-bold small text-secondary mb-2 uppercase">Tables & Columns</div>
              {dbTables.length === 0 ? (
                <div className="text-muted small py-3 text-center">
                  <FaInfoCircle className="text-warning mb-1" />
                  <br />No tables found. Create a table using standard SQL queries!
                </div>
              ) : (
                <div className="accordion accordion-flush" id="schemaTables">
                  {dbTables.map((t, idx) => (
                    <div className="accordion-item bg-transparent text-white border-bottom border-secondary border-opacity-10" key={t.name}>
                      <h2 className="accordion-header" id={`flush-hd-${idx}`}>
                        <button 
                          className="accordion-button collapsed bg-transparent text-white px-2 py-3" 
                          type="button" 
                          data-bs-toggle="collapse" 
                          data-bs-target={`#flush-tbl-${idx}`}
                          style={{ boxShadow: 'none' }}
                        >
                          <span className="font-monospace text-primary fw-bold">{t.name}</span>
                        </button>
                      </h2>
                      <div id={`flush-tbl-${idx}`} className="accordion-collapse collapse" data-bs-parent="#schemaTables">
                        <div className="accordion-body px-2 py-2 font-monospace small">
                          <table className="table table-sm table-borderless mb-0">
                            <tbody>
                              {t.columns.map(col => (
                                <tr key={col.name}>
                                  <td className="text-info">{col.name}</td>
                                  <td className="text-muted text-end">{col.type}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: SQL Editor & Output */}
        <div className="col-lg-9 mb-4">
          {selectedSchema?.description && (
            <div className="card glass-card p-3 mb-3 border border-info border-opacity-35 bg-info bg-opacity-5">
              <h6 className="fw-bold mb-1 text-info d-flex align-items-center gap-2">
                <span className="spinner-grow spinner-grow-sm text-info" role="status" style={{ width: '8px', height: '8px' }} />
                📝 Assignment Prompt & Instructions
              </h6>
              <div className="text-light small text-opacity-95 whitespace-pre-wrap font-monospace" style={{ fontSize: '0.86rem' }}>
                {selectedSchema.description}
              </div>
            </div>
          )}
          {/* Query Editor card wrapper */}
          <div className="mb-4">
            <MonacoEditorWrapper value={query} onChange={setQuery} />
            <div className="d-flex justify-content-end gap-2 mt-2">
              <button 
                className="btn btn-primary d-flex align-items-center gap-2 fw-bold px-4" 
                disabled={executing || !engineReady}
                onClick={runQuery}
              >
                {executing ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" /> Executing...
                  </>
                ) : (
                  <>
                    <FaPlay /> Execute Query (F5)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results card wrapper */}
          <div className="card glass-card p-3 shadow-sm border border-secondary border-opacity-10" style={{ minHeight: '300px' }}>
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center border-bottom pb-2 mb-3 gap-2">
              <ul className="nav nav-pills card-header-pills bg-secondary bg-opacity-10 p-1 rounded">
                <li className="nav-item">
                  <button 
                    className={`nav-link sm-pill py-2 px-3 fw-bold ${resultsTab === 'grid' ? 'active' : ''}`}
                    onClick={() => setResultsTab('grid')}
                  >
                    Result Dataset
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className={`nav-link sm-pill py-2 px-3 fw-bold ${resultsTab === 'message' ? 'active' : ''}`}
                    onClick={() => setResultsTab('message')}
                  >
                    Console Messages
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className={`nav-link sm-pill py-2 px-3 fw-bold ${resultsTab === 'json' ? 'active' : ''}`}
                    onClick={() => setResultsTab('json')}
                  >
                    Raw JSON
                  </button>
                </li>
              </ul>

              {queryResult && queryResult.length > 0 && resultsTab === 'grid' && (
                <button className="btn btn-sm btn-outline-success d-flex align-items-center gap-2 fw-bold" onClick={exportCSV}>
                  <FaFileCsv /> Export to CSV
                </button>
              )}
            </div>

            <div className="results-container overflow-auto" style={{ maxHeight: '350px' }}>
              {executing && (
                <div className="text-center py-5 text-muted">
                  <span className="spinner-border text-primary fs-3 mb-2" role="status" />
                  <p>Running query against active in-memory sandbox...</p>
                </div>
              )}

              {!executing && resultsTab === 'grid' && (
                <>
                  {queryError && (
                    <div className="alert alert-danger font-monospace border-danger text-danger">
                      <strong>⚠️ SQL Execution Error:</strong>
                      <pre className="mt-2 mb-0 whitespace-pre-wrap">{queryError}</pre>
                    </div>
                  )}

                  {!queryError && (!queryResult || queryResult.length === 0) ? (
                    <div className="text-muted py-5 text-center">
                      <FaInfoCircle className="fs-3 text-secondary mb-2" />
                      <p className="mb-0">No records returned or query not yet executed.</p>
                      <span className="small text-muted">Run SELECT queries to see results in this dataset grid.</span>
                    </div>
                  ) : !queryError ? (
                    <div className="table-responsive rounded shadow-sm border border-secondary border-opacity-10">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-secondary bg-opacity-25 header-dark">
                          <tr>
                            {Object.keys(queryResult[0]).map(h => (
                              <th key={h} className="font-monospace fw-bold text-primary">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="font-monospace">
                          {queryResult.map((row, idx) => (
                            <tr key={idx}>
                              {Object.values(row).map((val, cellIdx) => (
                                <td key={cellIdx}>
                                  {val === null || val === undefined ? (
                                    <span className="text-muted small">NULL</span>
                                  ) : (
                                    String(val)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </>
              )}

              {!executing && resultsTab === 'message' && (
                <div className="font-monospace font-size-14 p-3 bg-dark text-light rounded border border-secondary border-opacity-20">
                  {queryError ? (
                    <div className="text-danger">
                      <span className="fw-bold">Error:</span> {queryError}
                    </div>
                  ) : (
                    <div className="text-success">
                      <span className="fw-bold">Message:</span> {executionMessage}
                    </div>
                  )}
                </div>
              )}

              {!executing && resultsTab === 'json' && (
                <pre className="p-3 bg-dark text-warning rounded font-monospace small whitespace-pre-wrap border border-secondary border-opacity-20 mb-0">
                  {queryResult ? JSON.stringify(queryResult, null, 2) : 'No results to display.'}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Teachers: Custom Schemas management Modal */}
      {showManageModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content glass-card border border-primary p-3" style={{ borderRadius: '20px' }}>
              <div className="modal-header border-0 pb-0 d-flex justify-content-between align-items-center">
                <h5 className="modal-title fw-bold text-primary"><FaDatabase /> Manage Practice Assignments</h5>
                <button type="button" className="btn-close" onClick={() => setShowManageModal(false)}></button>
              </div>
              <div className="modal-body py-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="small text-muted">Create practice assignments with SQL instructions and pre-loaded schemas.</div>
                  <button className="btn btn-sm btn-primary d-flex align-items-center gap-1 fw-bold" onClick={openCreateForm}>
                    <FaPlus /> Create Practice Assignment
                  </button>
                </div>
                
                <div className="list-group list-group-flush overflow-auto border-top border-secondary border-opacity-10 mt-2" style={{ maxHeight: '380px' }}>
                  {schemas.map(s => {
                    const isSystem = s.id === 'default-company' || s.id === 'default-university';
                    return (
                      <div className="list-group-item bg-transparent py-3 px-2 border-bottom border-secondary border-opacity-10 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2" key={s.id || s._id}>
                        <div>
                          <h6 className="fw-bold mb-1 d-flex align-items-center gap-2">
                            {s.title} 
                            {isSystem ? (
                              <span className="badge bg-secondary small-pill">ReadOnly System</span>
                            ) : (
                              <span className="badge bg-info small-pill">Assigned: {s.assigned_class || 'All'}</span>
                            )}
                          </h6>
                          <div className="small text-muted">{s.description}</div>
                        </div>
                        {!isSystem && (
                          <div className="d-flex gap-2">
                            <button className="btn btn-sm btn-outline-info" onClick={() => openEditForm(s)}>
                              <FaEdit /> Edit
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => deleteSchema(s.id || s._id)}>
                              <FaTrashAlt /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teachers: Create/Edit Schema details Form Modal */}
      {showFormModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1060 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content glass-card border border-primary p-3" style={{ borderRadius: '24px' }}>
              <div className="modal-header border-0 pb-0 d-flex justify-content-between align-items-center">
                <h5 className="modal-title fw-bold text-primary">
                  {formMode === 'create' ? 'Create Practice Assignment' : 'Edit Practice Assignment'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowFormModal(false)}></button>
              </div>
              <form onSubmit={handleFormSubmit}>
                <div className="modal-body py-3">
                  {formError && (
                    <div className="alert alert-danger py-2 mb-3">
                      {formError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-bold">DB Schema Title</label>
                    <input 
                      type="text" className="form-control" required placeholder="e.g. Sales Department DB"
                      value={formFields.title}
                      onChange={e => setFormFields({ ...formFields, title: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Assignment Instructions / Prompt</label>
                    <textarea 
                      className="form-control" rows="3" required placeholder="e.g. Write a query to select all customer names where department is Marketing..."
                      value={formFields.description}
                      onChange={e => setFormFields({ ...formFields, description: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Assigned Class Section (Audience)</label>
                    <select 
                      className="form-select"
                      required
                      value={formFields.assignedClass}
                      onChange={e => setFormFields({ ...formFields, assignedClass: e.target.value })}
                    >
                      <option value="All">All Classes (Public)</option>
                      <option value="Class A">Class A Only</option>
                      <option value="Class B">Class B Only</option>
                      <option value="None">None (Draft / Private)</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">SQL Schema (CREATE TABLE and INSERT Statements)</label>
                    <textarea 
                      className="form-control font-monospace" rows="8" required 
                      placeholder={`-- Example:\nCREATE TABLE items (id INT PRIMARY KEY, name VARCHAR(100));\nINSERT INTO items VALUES (1, 'Widget A');`}
                      value={formFields.schemaSql}
                      onChange={e => setFormFields({ ...formFields, schemaSql: e.target.value })}
                      style={{ fontSize: '0.9rem' }}
                    />
                    <div className="form-text small text-muted">
                      Use semicolons (;) to separate SQL statements. All statements will execute sequentially to form the sandboxed database.
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0 d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary fw-bold">
                    {formMode === 'create' ? 'Create Assignment' : 'Save Details'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SqlPlayground;
