import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DevDashboardPage from './pages/DevDashboardPage';
import { motion } from 'framer-motion';
import { Shield, Loader } from 'lucide-react';
import { Toaster } from 'sonner';

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl gradient-teal flex items-center justify-center shadow-xl shadow-laya-teal/30 animate-pulse">
            <Shield size={32} className="text-white" />
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Loader size={16} className="animate-spin text-laya-teal" />
            <span className="text-sm">Loading...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Public route — redirect to appropriate dashboard if already logged in
function PublicRoute({ children }) {
  const { isAuthenticated, isDeveloper, loading } = useAuth();

  if (loading) return null;
  if (isAuthenticated) {
    return <Navigate to={isDeveloper ? '/dev-dashboard' : '/dashboard'} replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '12px',
              fontSize: '13px',
              padding: '12px 16px',
            },
            className: 'shadow-lg',
          }}
          richColors
          closeButton
        />
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/dev-dashboard" element={<ProtectedRoute><DevDashboardPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
