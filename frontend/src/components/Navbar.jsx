import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { FaBars, FaSun, FaMoon } from 'react-icons/fa';

const Navbar = ({ onToggleSidebar }) => {
  const { user, darkMode, toggleTheme } = useAuth();
  const location = useLocation();
  const isExamPage = location.pathname.startsWith('/student/exams/');

  return (
    <nav className="navbar top-navbar px-4">
      <div className="container-fluid d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          {!isExamPage && (
            <button 
              className="btn btn-outline-secondary d-md-none p-2 border-0" 
              onClick={onToggleSidebar}
              aria-label="Toggle navigation"
              style={{ minHeight: 'unset', width: '38px', height: '38px' }}
            >
              <FaBars size={20} />
            </button>
          )}
          <span className="navbar-brand mb-0 h1 fw-bold fs-4 text-gradient">
            {isExamPage ? "Exam Portal" : "Portal"}
          </span>
        </div>
        <div className="d-flex align-items-center gap-3">
          {isExamPage && (
            <button 
              onClick={toggleTheme} 
              className="btn btn-link p-1 text-decoration-none border-0 d-flex align-items-center justify-content-center"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}
            >
              {darkMode ? <FaSun className="text-warning" size={18} /> : <FaMoon className="text-primary" size={18} />}
            </button>
          )}
          <div className="text-end">
            <div className="fw-semibold">{user?.name}</div>
            <div className="text-muted small" style={{ fontSize: '0.75rem' }}>{user?.role}</div>
          </div>
          <div 
            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" 
            style={{ width: '40px', height: '40px', fontWeight: 'bold' }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
