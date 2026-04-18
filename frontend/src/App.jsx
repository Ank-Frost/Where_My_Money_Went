import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import SearchPage from './pages/SearchPage';
import BudgetPage from './pages/BudgetPage';
import SplitPage from './pages/SplitPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import GoalsPage from './pages/GoalsPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="text-center">
        <div className="text-4xl mb-4">₹</div>
        <p className="text-gray-400 animate-pulse">Loading...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login"  element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/setup"  element={user ? <Navigate to="/" replace /> : <SetupPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <NotificationProvider>
            <Layout />
          </NotificationProvider>
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="budget" element={<BudgetPage />} />
        <Route path="split" element={<SplitPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
