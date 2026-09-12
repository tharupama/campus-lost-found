import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import FeedPage from './pages/FeedPage';
import ItemDetailPage from './pages/ItemDetailPage';
import MyClaimsPage from './pages/MyClaimsPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminPage from './pages/AdminPage';
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

function RoleGate({ children }) {
  const { user } = useAuth();
  if (!user || !['admin', 'guard'].includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function RootRedirect() {
  const { user } = useAuth();
  return user && ['admin', 'guard'].includes(user.role) ? <Navigate to="/admin" replace /> : <FeedPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <LoginGate>
                  <AppShell />
                </LoginGate>
              }
            >
              <Route path="/" element={<RootRedirect />} />
              <Route path="/items/:id" element={<ItemDetailPage />} />
              <Route path="/my-claims" element={<MyClaimsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route
                path="/admin"
                element={
                  <RoleGate>
                    <AdminPage />
                  </RoleGate>
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