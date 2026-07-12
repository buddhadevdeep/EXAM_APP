import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaTachometerAlt, FaUserGraduate, FaChalkboardTeacher, FaBook, 
  FaQuestion, FaFolderOpen, FaSignOutAlt, FaMoon, FaSun,
  FaFileAlt, FaLock, FaCamera
} from 'react-icons/fa';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, darkMode, toggleTheme } = useAuth();

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  return (
    <div className={`sidebar d-flex flex-column p-3 ${isOpen ? 'open' : ''}`}>
      <div className="d-flex align-items-center gap-2 mb-4 px-2">
        <h5 className="mb-0 fw-bold text-primary">Smart SQL Exam</h5>
      </div>

      <ul className="nav nav-pills flex-column mb-auto">
        {user?.role === 'Admin' && (
          <>
            <li className="nav-item">
              <NavLink to="/admin/dashboard" className="nav-link" onClick={handleLinkClick}>
                <FaTachometerAlt /> Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/users" className="nav-link" onClick={handleLinkClick}>
                <FaUserGraduate /> Manage Users
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/subjects" className="nav-link" onClick={handleLinkClick}>
                <FaBook /> Subjects & Banks
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/questions" className="nav-link" onClick={handleLinkClick}>
                <FaQuestion /> Question Bank
              </NavLink>
            </li>
          </>
        )}

        {user?.role === 'Teacher' && (
          <>
            <li className="nav-item">
              <NavLink to="/teacher/dashboard" className="nav-link" onClick={handleLinkClick}>
                <FaTachometerAlt /> Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/teacher/exams/new" className="nav-link" onClick={handleLinkClick}>
                <FaFolderOpen /> Create Exam
              </NavLink>
            </li>
            <li>
              <NavLink to="/teacher/students" className="nav-link" onClick={handleLinkClick}>
                <FaUserGraduate /> Students
              </NavLink>
            </li>
            <li>
              <NavLink to="/teacher/scan" className="nav-link" onClick={handleLinkClick}>
                <FaCamera /> Scan Student QR
              </NavLink>
            </li>
          </>
        )}

        {user?.role === 'Student' && (
          <>
            <li className="nav-item">
              <NavLink to="/student/dashboard" className="nav-link" onClick={handleLinkClick}>
                <FaTachometerAlt /> Exams
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/submissions" className="nav-link" onClick={handleLinkClick}>
                <FaFileAlt /> History & Marks
              </NavLink>
            </li>
          </>
        )}

        <li>
          <NavLink to="/profile" className="nav-link" onClick={handleLinkClick}>
            <FaLock /> Profile / Security
          </NavLink>
        </li>
      </ul>

      <hr />

      <div className="px-2 d-flex flex-column gap-2">
        <button className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2" onClick={toggleTheme}>
          {darkMode ? <FaSun className="text-warning" /> : <FaMoon />} {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button className="btn btn-danger d-flex align-items-center justify-content-center gap-2" onClick={logout}>
          <FaSignOutAlt /> Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
