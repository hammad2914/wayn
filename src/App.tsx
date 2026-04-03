import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { LanguageProvider } from './contexts/LanguageContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { GuestRoute } from './components/layout/GuestRoute';
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

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              {/* Public — accessible to everyone */}
              <Route path="/" element={<LandingPage />} />

              {/* Guest-only — redirect to dashboard if already logged in */}
              <Route path="/login"           element={<GuestRoute><LoginPage /></GuestRoute>} />
              <Route path="/signup"          element={<GuestRoute><SignupPage /></GuestRoute>} />
              <Route path="/verify-otp"      element={<GuestRoute><OTPVerifyPage /></GuestRoute>} />
              <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
              <Route path="/reset-password"  element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />

              {/* Protected — redirect to login if not logged in */}
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
    </LanguageProvider>
  );
};

export default App;
