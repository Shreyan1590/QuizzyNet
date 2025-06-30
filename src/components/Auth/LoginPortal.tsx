import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Shield, GraduationCap, Users, BookOpen, Award, Target } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const LoginPortal: React.FC = () => {
  const [activePortal, setActivePortal] = useState<'student' | 'faculty' | 'admin'>('student');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    registrationNumber: '',
    username: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, facultyLogin, adminLogin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      switch (activePortal) {
        case 'student':
          await login(formData.email, formData.password);
          break;
        case 'faculty':
          await facultyLogin(formData.email, formData.password);
          break;
        case 'admin':
          await adminLogin(formData.username, formData.password);
          break;
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const portals = [
    {
      id: 'student' as const,
      name: 'Student Portal',
      icon: GraduationCap,
      color: 'blue',
      description: 'Access courses, quizzes, and academic records',
      features: ['Course Enrollment', 'Quiz Examinations', 'Academic Progress', 'Profile Management']
    },
    {
      id: 'faculty' as const,
      name: 'Faculty Portal',
      icon: Users,
      color: 'green',
      description: 'Manage courses, create quizzes, and view student progress',
      features: ['Course Management', 'Quiz Creation', 'Student Analytics', 'Result Tracking']
    },
    {
      id: 'admin' as const,
      name: 'Admin Portal',
      icon: Shield,
      color: 'purple',
      description: 'System administration and user management',
      features: ['User Management', 'Course Approval', 'System Analytics', 'Security Control']
    }
  ];

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors = {
      blue: isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
      green: isActive ? 'bg-green-600 text-white border-green-600' : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
      purple: isActive ? 'bg-purple-600 text-white border-purple-600' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200'
    };
    return colors[color as keyof typeof colors];
  };

  const getButtonColor = (color: string) => {
    const colors = {
      blue: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
      green: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800',
      purple: 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
    };
    return colors[color as keyof typeof colors];
  };

  const activePortalData = portals.find(p => p.id === activePortal)!;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">QuizzyNet - SIMATS</h1>
                <p className="text-sm text-gray-600">Comprehensive Learning Management System</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4" />
                <span>Course Management</span>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4" />
                <span>Assessment Tools</span>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4" />
                <span>Progress Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Portal Selection */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Portal</h2>
          <p className="text-lg text-gray-600 mb-8">Select the appropriate portal to access your dashboard</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {portals.map((portal) => (
              <button
                key={portal.id}
                onClick={() => setActivePortal(portal.id)}
                className={`p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${getColorClasses(portal.color, activePortal === portal.id)}`}
              >
                <portal.icon className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{portal.name}</h3>
                <p className="text-sm opacity-90 mb-4">{portal.description}</p>
                <div className="space-y-1">
                  {portal.features.map((feature, index) => (
                    <div key={index} className="text-xs opacity-75">• {feature}</div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Form Header */}
            <div className={`p-6 ${getButtonColor(activePortalData.color)}`}>
              <div className="text-center">
                <activePortalData.icon className="w-12 h-12 mx-auto mb-3 text-white" />
                <h3 className="text-xl font-bold text-white">{activePortalData.name}</h3>
                <p className="text-white/90 text-sm mt-1">Sign in to access your dashboard</p>
              </div>
            </div>

            {/* Form Body */}
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {activePortal === 'student' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>
                )}

                {activePortal === 'faculty' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Faculty Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        placeholder="Enter faculty email"
                        required
                      />
                    </div>
                  </div>
                )}

                {activePortal === 'admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="Enter admin username"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-all ${getButtonColor(activePortalData.color)} ${
                    loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg transform hover:-translate-y-0.5'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    `Sign In to ${activePortalData.name}`
                  )}
                </button>
              </form>

              {activePortal === 'student' && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                      Register here
                    </Link>
                  </p>
                </div>
              )}

              {activePortal === 'faculty' && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Need faculty access?{' '}
                    <Link to="/register" className="text-green-600 hover:text-green-700 font-medium">
                      Request Account
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features Overview */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Platform Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-white rounded-xl shadow-md border border-gray-200">
              <BookOpen className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Course Management</h4>
              <p className="text-gray-600 text-sm">Comprehensive course creation, enrollment, and tracking system</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-md border border-gray-200">
              <Award className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Assessment Tools</h4>
              <p className="text-gray-600 text-sm">Advanced quiz creation with security features and analytics</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-md border border-gray-200">
              <Target className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Progress Tracking</h4>
              <p className="text-gray-600 text-sm">Real-time performance monitoring and detailed analytics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-600">
            <p>&copy; 2025 QuizzyNet - SIMATS. All rights reserved. | Secure Learning Management System</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPortal;