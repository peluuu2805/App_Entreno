import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'sonner';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Suspense, lazy } from 'react';
import MainLayout from './layouts/MainLayout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const UpdatePassword = lazy(() => import('./pages/UpdatePassword'));
const CalendarBlocks = lazy(() => import('./pages/CalendarBlocks'));
const Progression = lazy(() => import('./pages/Progression'));
const AIChat = lazy(() => import('./pages/AIChat'));
const Nutrition = lazy(() => import('./pages/Nutrition'));
const Measurements = lazy(() => import('./pages/Measurements'));
const Settings = lazy(() => import('./pages/Settings'));
function App() {
  return (
    <>
      <Toaster theme="dark" />
      <Router>
        <AuthProvider>
        <Suspense fallback={
          <div className="flex h-screen bg-[#050505] items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* Nested Routes */}
              <Route index element={<Dashboard />} />
              <Route path="blocks" element={<CalendarBlocks />} />
              <Route path="progression" element={<Progression />} />
              <Route path="nutrition" element={<Nutrition />} />
              <Route path="measurements" element={<Measurements />} />
              <Route path="console" element={<AIChat />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
    </>
  );
}

export default App;
