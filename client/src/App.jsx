import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ExpertRoute from './components/ExpertRoute';
import Layout from './components/Layout';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import NewDiagnosisPage from './pages/NewDiagnosisPage';
import DiagnosisResultPage from './pages/DiagnosisResultPage';
import DiagnosisHistoryPage from './pages/DiagnosisHistoryPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';

function PrivateLayout({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/dashboard"
            element={
              <PrivateLayout>
                <DashboardPage />
              </PrivateLayout>
            }
          />
          <Route
            path="/patients"
            element={
              <PrivateLayout>
                <PatientsPage />
              </PrivateLayout>
            }
          />
          <Route
            path="/patients/:id"
            element={
              <PrivateLayout>
                <PatientDetailPage />
              </PrivateLayout>
            }
          />
          <Route
            path="/diagnosis/new"
            element={
              <PrivateLayout>
                <NewDiagnosisPage />
              </PrivateLayout>
            }
          />
          <Route
            path="/diagnoses"
            element={
              <PrivateLayout>
                <DiagnosisHistoryPage />
              </PrivateLayout>
            }
          />
          <Route
            path="/diagnoses/:id"
            element={
              <PrivateLayout>
                <DiagnosisResultPage />
              </PrivateLayout>
            }
          />
          <Route
            path="/admin/knowledge-base"
            element={
              <ExpertRoute>
                <Layout>
                  <KnowledgeBasePage />
                </Layout>
              </ExpertRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
