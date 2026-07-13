import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

import Login from './pages/Login';
import Profile from './pages/Profile';

// Admin
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import Subjects from './pages/Subjects';
import Questions from './pages/Questions';

// Teacher
import TeacherDashboard from './pages/TeacherDashboard';
import CreateExam from './pages/CreateExam';
import EditExam from './pages/EditExam';
import Submissions from './pages/Submissions';
import GradeSubmission from './pages/GradeSubmission';
import StudentManagement from './pages/StudentManagement';
import VerifySubmission from './pages/VerifySubmission';
import TeacherScan from './pages/TeacherScan';

// Student
import StudentDashboard from './pages/StudentDashboard';
import TakeExam from './pages/TakeExam';
import StudentSubmissions from './pages/StudentSubmissions';

// Bootstrap CSS & styling
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppLayout = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const location = useLocation();
  
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;

  const isExamPage = location.pathname.startsWith('/student/exams/');

  return (
    <div className="d-flex min-vh-100">
      {!isExamPage && (
        <>
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          {sidebarOpen && (
            <div className="sidebar-backdrop d-md-none" onClick={() => setSidebarOpen(false)} />
          )}
        </>
      )}
      <div className="flex-grow-1 d-flex flex-column" style={{ overflowX: 'hidden' }}>
        <Navbar onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
        <main className="flex-grow-1 p-4" style={{ background: 'var(--bg-light-trans)' }}>
          <Routes>
            <Route path="/" element={<Navigate to={user.role === 'Admin' ? '/admin/dashboard' : user.role === 'Teacher' ? '/teacher/dashboard' : '/student/dashboard'} replace />} />
            
            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['Admin']}><UserManagement /></ProtectedRoute>} />
            <Route path="/admin/subjects" element={<ProtectedRoute allowedRoles={['Admin']}><Subjects /></ProtectedRoute>} />
            <Route path="/admin/questions" element={<ProtectedRoute allowedRoles={['Admin']}><Questions /></ProtectedRoute>} />
            
            {/* Teacher Routes */}
            <Route path="/teacher/dashboard" element={<ProtectedRoute allowedRoles={['Teacher']}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/exams/new" element={<ProtectedRoute allowedRoles={['Teacher']}><CreateExam /></ProtectedRoute>} />
            <Route path="/teacher/exams/:examId/edit" element={<ProtectedRoute allowedRoles={['Teacher']}><EditExam /></ProtectedRoute>} />
            <Route path="/teacher/exams/:examId/submissions" element={<ProtectedRoute allowedRoles={['Teacher']}><Submissions /></ProtectedRoute>} />
            <Route path="/teacher/submissions/:submissionId" element={<ProtectedRoute allowedRoles={['Teacher']}><GradeSubmission /></ProtectedRoute>} />
            <Route path="/teacher/students" element={<ProtectedRoute allowedRoles={['Teacher']}><StudentManagement /></ProtectedRoute>} />
            <Route path="/teacher/scan" element={<ProtectedRoute allowedRoles={['Teacher']}><TeacherScan /></ProtectedRoute>} />

            {/* Student Routes */}
            <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['Student']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/exams/:examId" element={<ProtectedRoute allowedRoles={['Student']}><TakeExam /></ProtectedRoute>} />
            <Route path="/student/submissions" element={<ProtectedRoute allowedRoles={['Student']}><StudentSubmissions /></ProtectedRoute>} />

            <Route path="/verify-submission/:submissionId" element={<VerifySubmission />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </Router>
  );
}

export default App;
