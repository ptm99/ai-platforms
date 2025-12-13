import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';

import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import ProjectListPage from '../pages/projects/ProjectListPage';
import ProjectDetailPage from '../pages/projects/ProjectDetailPage';
import ProjectSharePage from '../pages/projects/ProjectSharePage';
import ProvidersAdminPage from '../pages/admin/ProvidersAdminPage';
import ModelsAdminPage from '../pages/admin/ModelsAdminPage';
import KeysAdminPage from '../pages/admin/KeysAdminPage';
import UsersAdminPage from '../pages/admin/UsersAdminPage';

export const AppRouter: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />

      {/* Protected user routes */}
      <Route element={<ProtectedRoute allowedRoles={['user', 'admin', 'superadmin']} />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectListPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/projects/:id/share" element={<ProjectSharePage />} />
      </Route>

      {/* Admin routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin', 'superadmin']} />}>
        <Route path="/admin/providers" element={<ProvidersAdminPage />} />
        <Route path="/admin/models" element={<ModelsAdminPage />} />
        <Route path="/admin/keys" element={<KeysAdminPage />} />
      </Route>

      {/* Superadmin routes */}
      <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
        <Route path="/admin/users" element={<UsersAdminPage />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  );
};
