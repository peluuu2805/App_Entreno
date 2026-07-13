import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'sonner';
import { ProtectedRoute } from './components/ProtectedRoute';

import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import CalendarBlocks from './pages/CalendarBlocks';
import Progression from './pages/Progression';
import AIChat from './pages/AIChat';
import Nutrition from './pages/Nutrition';
import Measurements from './pages/Measurements';
import Settings from './pages/Settings';
function App() {
  return (
    <>
      <Toaster theme="dark" />
      <Router>
        <AuthProvider>
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
      </AuthProvider>
    </Router>
    </>
  );
}

export default App;
