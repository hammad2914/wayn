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
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardLayout } from './pages/dashboard/DashboardLayout';
import { DashboardHomePage } from './pages/dashboard/DashboardHomePage';
import { AddressesPage } from './pages/dashboard/AddressesPage';
import { RoutesPage } from './pages/dashboard/RoutesPage';
import { AccountPage } from './pages/dashboard/AccountPage';
import { DriverPage } from './pages/DriverPage';

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
              {/* A driver's stops for the day; the link itself is the key */}
              <Route path="/d/:token" element={<DriverPage />} />

              {/* Guest-only — redirect to dashboard if already logged in */}
              <Route path="/login"           element={<GuestRoute><LoginPage /></GuestRoute>} />
              <Route path="/signup"          element={<GuestRoute><SignupPage /></GuestRoute>} />
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
                <Route path="addresses"          element={<AddressesPage />} />
                <Route path="routes"             element={<RoutesPage />} />
                <Route path="account"            element={<AccountPage />} />
                {/* old addresses, kept so saved links still land */}
                <Route path="address-normalizer" element={<Navigate to="/dashboard/addresses" replace />} />
                <Route path="route-optimizer"    element={<Navigate to="/dashboard/routes" replace />} />
                <Route path="profile"            element={<Navigate to="/dashboard/account" replace />} />
                <Route path="settings"           element={<Navigate to="/dashboard/account" replace />} />
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
