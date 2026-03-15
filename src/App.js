import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Home          from './pages/Home';
import LoginPage     from './pages/LoginPage';
import AdminDashboard   from './pages/AdminDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import StudentDashboard from './pages/StudentDashboard';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, role } = useAuth();
  if (!token) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  const { token, role } = useAuth();

  const getDashboard = () => {
    if (role === 'admin')   return <Navigate to="/admin"   replace />;
    if (role === 'faculty') return <Navigate to="/faculty" replace />;
    if (role === 'student') return <Navigate to="/student" replace />;
    return <Home />;
  };

  return (
    <Routes>
      <Route path="/" element={token ? getDashboard() : <Home />} />
      <Route path="/login/:role" element={<LoginPage />} />
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/faculty" element={
        <ProtectedRoute allowedRoles={['admin','faculty']}>
          <FacultyDashboard />
        </ProtectedRoute>
      } />
      <Route path="/student" element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentDashboard />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
