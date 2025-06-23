import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Layout/Header';
import LoginForm from './components/Auth/LoginForm';
import RegisterForm from './components/Auth/RegisterForm';
import StudentDashboard from './components/Student/Dashboard';
import AdminDashboard from './components/Admin/Dashboard';
import StudentManagement from './components/Admin/StudentManagement';
import QuizManagement from './components/Admin/QuizManagement';
import QuestionManagement from './components/Admin/QuestionManagement';
import ResultsAnalytics from './components/Admin/ResultsAnalytics';
import Reports from './components/Admin/Reports';
import SecurityLogs from './components/Admin/SecurityLogs';
import QuizInterface from './components/Quiz/QuizInterface';
import QuizResults from './components/Quiz/QuizResults';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({ 
  children, 
  requiredRole 
}) => {
  const { currentUser, userRole } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Routes>
        <Route 
          path="/" 
          element={
            userRole === 'admin' ? 
              <Navigate to="/admin" replace /> : 
              <Navigate to="/dashboard" replace />
          } 
        />
        
        {/* Student Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute requiredRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/quiz/:quizId" 
          element={
            <ProtectedRoute requiredRole="student">
              <QuizInterface />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/results/:resultId" 
          element={
            <ProtectedRoute requiredRole="student">
              <QuizResults />
            </ProtectedRoute>
          } 
        />

        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/students" 
          element={
            <ProtectedRoute requiredRole="admin">
              <StudentManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/quizzes" 
          element={
            <ProtectedRoute requiredRole="admin">
              <QuizManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/questions" 
          element={
            <ProtectedRoute requiredRole="admin">
              <QuestionManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/analytics" 
          element={
            <ProtectedRoute requiredRole="admin">
              <ResultsAnalytics />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/reports" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Reports />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/security" 
          element={
            <ProtectedRoute requiredRole="admin">
              <SecurityLogs />
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;