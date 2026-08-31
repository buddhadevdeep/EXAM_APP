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
import SqlPlayground from './pages/SqlPlayground';

// SQL Practice Module Pages
import SqlDatabases from './pages/SqlDatabases';
import SqlAssignments from './pages/SqlAssignments';
import SqlGrades from './pages/SqlGrades';
import SqlGradeSubmission from './pages/SqlGradeSubmission';
import StudentSqlAssignments from './pages/StudentSqlAssignments';
import TakeSqlAssignment from './pages/TakeSqlAssignment';
import StudentSqlSubmissions from './pages/StudentSqlSubmissions';
import StudentSqlSubmissionDetail from './pages/StudentSqlSubmissionDetail';

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
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const location = useLocation();
  
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
    if (location.pathname !== '/login') {
      return <Navigate to="/login" replace />;
    }
    return <Routes><Route path="/login" element={<Login />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes>;
  }

  const isExamPage = location.pathname.startsWith('/student/exams/') || location.pathname.startsWith('/student/sql-assignments/take/');

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

            {/* SQL Practice Teacher Routes */}
            <Route path="/teacher/sql-databases" element={<ProtectedRoute allowedRoles={['Teacher']}><SqlDatabases /></ProtectedRoute>} />
            <Route path="/teacher/sql-assignments" element={<ProtectedRoute allowedRoles={['Teacher']}><SqlAssignments /></ProtectedRoute>} />
            <Route path="/teacher/sql-grades" element={<ProtectedRoute allowedRoles={['Teacher']}><SqlGrades /></ProtectedRoute>} />
            <Route path="/teacher/sql-grades/:submissionId" element={<ProtectedRoute allowedRoles={['Teacher']}><SqlGradeSubmission /></ProtectedRoute>} />

            {/* Student Routes */}
            <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['Student']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/exams/:examId" element={<ProtectedRoute allowedRoles={['Student']}><TakeExam /></ProtectedRoute>} />
            <Route path="/student/submissions" element={<ProtectedRoute allowedRoles={['Student']}><StudentSubmissions /></ProtectedRoute>} />

            {/* SQL Practice Student Routes */}
            <Route path="/student/sql-assignments" element={<ProtectedRoute allowedRoles={['Student']}><StudentSqlAssignments /></ProtectedRoute>} />
            <Route path="/student/sql-assignments/take/:assignmentId" element={<ProtectedRoute allowedRoles={['Student']}><TakeSqlAssignment /></ProtectedRoute>} />
            <Route path="/student/sql-submissions" element={<ProtectedRoute allowedRoles={['Student']}><StudentSqlSubmissions /></ProtectedRoute>} />
            <Route path="/student/sql-submissions/:submissionId" element={<ProtectedRoute allowedRoles={['Student']}><StudentSqlSubmissionDetail /></ProtectedRoute>} />

            <Route path="/verify-submission/:submissionId" element={<VerifySubmission />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/practice/sandbox" element={<ProtectedRoute allowedRoles={['Student', 'Teacher']}><SqlPlayground /></ProtectedRoute>} />
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
