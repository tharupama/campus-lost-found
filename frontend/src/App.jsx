import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import FeedPage from './pages/FeedPage';
import ItemDetailPage from './pages/ItemDetailPage';
import MyClaimsPage from './pages/MyClaimsPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminPage from './pages/AdminPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import ProfilePage from './pages/ProfilePage';
import Spinner from './components/ui/Spinner';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function LoginGate({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner full label="Restoring session…" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminGate({ children }) {
  const { user } = useAuth();
  if (!user || user.role !== 'admin') {
    return <UnauthorizedPage />;
  }
  return children;
}

function GuardGate({ children }) {
  const { user } = useAuth();
  if (!user || user.role !== 'guard') {
    return <UnauthorizedPage />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/" element={<LandingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route
              element={
                <LoginGate>
                  <AppShell />
                </LoginGate>
              }
            >
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/items/:id" element={<ItemDetailPage />} />
              <Route path="/my-claims" element={<MyClaimsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/admin"
                element={
                  <AdminGate>
                    <AdminPage />
                  </AdminGate>
                }
              />
              <Route
                path="/guard"
                element={
                  <GuardGate>
                    <AdminPage />
                  </GuardGate>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3500,
              style: { borderRadius: '14px', fontWeight: 600 },
            }}
          />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}