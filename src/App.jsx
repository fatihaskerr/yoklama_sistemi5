import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute, useAuth } from './contexts/AuthContext';

// Components
import Login from './components/Login';
import StudentPanel from './components/StudentPanel';
import TeacherPanel from './components/TeacherPanel';
import AdminPanel from './components/AdminPanel';
import Navbar from './components/Navbar';
import StudentDataCollection from './components/StudentDataCollection';
import AttendanceTracking from './components/AttendanceTracking';
import FaceVerification from './components/FaceVerification';
import NotFoundPage from './components/NotFoundPage';
import UnauthorizedPage from './components/UnauthorizedPage';

// CSS
import './styles/global.css';
import 'bulma/css/bulma.min.css';

// Root level navigasyon kontrolü
const AuthenticatedRoutes = () => {
  const { currentUser, isAdmin, isTeacher, isStudent, logout } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <Navbar />
      <Routes>
        {/* Ana sayfa yönlendirmesi - rolüne göre */}
        <Route path="/" element={
          isAdmin() ? <Navigate to="/admin" replace /> :
          isTeacher() ? <Navigate to="/teacher" replace /> :
          isStudent() ? <Navigate to="/student" replace /> :
          <Navigate to="/login" replace />
        } />

        {/* Admin Rotaları */}
        <Route 
          path="admin" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminPanel user={currentUser} onLogout={logout} />
            </ProtectedRoute>
          } 
        />
        
        {/* Öğretmen Rotaları */}
        <Route 
          path="teacher" 
          element={
            <ProtectedRoute requiredRole="teacher">
              <TeacherPanel user={currentUser} onLogout={logout} />
            </ProtectedRoute>
          } 
        />

        {/* Öğrenci Rotaları */}
        <Route 
          path="student" 
          element={
            <ProtectedRoute requiredRole="student">
              <StudentPanel user={currentUser} onLogout={logout} />
            </ProtectedRoute>
          } 
        />

        {/* Ortak Rotalar */}
        <Route 
          path="veri-toplama" 
          element={
            <ProtectedRoute requiredRole="admin">
              <StudentDataCollection />
            </ProtectedRoute>
          } 
        />

        {/* Yetkisiz ve 404 sayfaları */}
        <Route path="unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<AuthenticatedRoutes />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
