import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPortal from './components/Auth/LoginPortal';
import RegisterForm from './components/Auth/RegisterForm';

// Student Components
import StudentDashboard from './components/Student/Dashboard';
import StudentCourses from './components/Student/Courses';
import StudentEnrollment from './components/Student/Enrollment';
import StudentQuiz from './components/Student/Quiz';
import StudentDisciplinary from './components/Student/Disciplinary';
import StudentProfile from './components/Student/Profile';
import QuizInterface from './components/Quiz/QuizInterface';
import QuizResults from './components/Quiz/QuizResults';

// Faculty Components
import FacultyDashboard from './components/Faculty/Dashboard';
import FacultyCourses from './components/Faculty/Courses';
import FacultyResults from './components/Faculty/Results';
import FacultyStudentView from './components/Faculty/StudentView';
import FacultyProfile from './components/Faculty/Profile';

// Admin Components
import AdminDashboard from './components/Admin/Dashboard';
import AdminStudents from './components/Admin/Students';
import AdminCourses from './components/Admin/Courses';
import AdminQuizzes from './components/Admin/Quizzes';
import AdminDisciplinary from './components/Admin/Disciplinary';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({ 
  children, 
  requiredRole 
}) => {
  const { currentUser, userRole, loading } = useAuth();
  
  // Show loading while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && userRole !== requiredRole) {
    // Redirect to appropriate dashboard based on user role
    const redirectPath = userRole === 'admin' ? '/admin' : 
                        userRole === 'faculty' ? '/faculty' : 
                        '/student';
    return <Navigate to={redirectPath} replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { currentUser, userRole, loading } = useAuth();

  // Show loading while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPortal />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Define the default route based on user role
  const getDefaultRoute = () => {
    switch (userRole) {
      case 'admin': return '/admin';
      case 'faculty': return '/faculty';
      case 'student': return '/student';
      default: return '/login';
    }
  };

  return (
    <Routes>
      <Route 
        path="/" 
        element={<Navigate to={getDefaultRoute()} replace />}
      />
      
      {/* Student Routes */}
      <Route 
        path="/student" 
        element={
          <ProtectedRoute requiredRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/student/courses" 
        element={
          <ProtectedRoute requiredRole="student">
            <StudentCourses />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/student/enrollment" 
        element={
          <ProtectedRoute requiredRole="student">
            <StudentEnrollment />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/student/quiz" 
        element={
          <ProtectedRoute requiredRole="student">
            <StudentQuiz />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/student/disciplinary" 
        element={
          <ProtectedRoute requiredRole="student">
            <StudentDisciplinary />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/student/profile" 
        element={
          <ProtectedRoute requiredRole="student">
            <StudentProfile />
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

      {/* Faculty Routes */}
      <Route 
        path="/faculty" 
        element={
          <ProtectedRoute requiredRole="faculty">
            <FacultyDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/faculty/courses" 
        element={
          <ProtectedRoute requiredRole="faculty">
            <FacultyCourses />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/faculty/results" 
        element={
          <ProtectedRoute requiredRole="faculty">
            <FacultyResults />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/faculty/students" 
        element={
          <ProtectedRoute requiredRole="faculty">
            <FacultyStudentView />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/faculty/profile" 
        element={
          <ProtectedRoute requiredRole="faculty">
            <FacultyProfile />
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
            <AdminStudents />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/courses" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminCourses />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/quizzes" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminQuizzes />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/disciplinary" 
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDisciplinary />
          </ProtectedRoute>
        } 
      />
      
      {/* Fallback route */}
      <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
    </Routes>
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