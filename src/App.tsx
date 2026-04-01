import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { OTPVerifyPage } from './pages/OTPVerifyPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardLayout } from './pages/dashboard/DashboardLayout';
import { DashboardHomePage } from './pages/dashboard/DashboardHomePage';
import { AddressNormalizerPage } from './pages/dashboard/AddressNormalizerPage';
import { RouteOptimizerPage } from './pages/dashboard/RouteOptimizerPage';
import { ProfilePage } from './pages/dashboard/ProfilePage';
import { SettingsPage } from './pages/dashboard/SettingsPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"                  element={<LandingPage />} />
            <Route path="/login"             element={<LoginPage />} />
            <Route path="/signup"            element={<SignupPage />} />
            <Route path="/verify-otp"        element={<OTPVerifyPage />} />
            <Route path="/forgot-password"   element={<ForgotPasswordPage />} />
            <Route path="/reset-password"    element={<ResetPasswordPage />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index                     element={<DashboardHomePage />} />
              <Route path="address-normalizer" element={<AddressNormalizerPage />} />
              <Route path="route-optimizer"    element={<RouteOptimizerPage />} />
              <Route path="profile"            element={<ProfilePage />} />
              <Route path="settings"           element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
