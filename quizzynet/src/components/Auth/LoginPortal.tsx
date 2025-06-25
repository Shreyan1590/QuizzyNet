import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Shield, GraduationCap, Users } from 'lucide-react';
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
      description: 'Access courses, quizzes, and academic records'
    },
    {
      id: 'faculty' as const,
      name: 'Faculty Portal',
      icon: Users,
      color: 'green',
      description: 'Manage courses, create quizzes, and view student progress'
    },
    {
      id: 'admin' as const,
      name: 'Admin Portal',
      icon: Shield,
      color: 'purple',
      description: 'System administration and user management'
    }
  ];

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors = {
      blue: isActive ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
      green: isActive ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100',
      purple: isActive ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="mx-auto h-20 w-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-6">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">QuizzyNet</h1>
          <p className="text-lg text-gray-600">Comprehensive Educational Management System with Quiz</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Portal Selection */}
          <div className="bg-gray-50 p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">Select Your Portal</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {portals.map((portal) => (
                <button
                  key={portal.id}
                  onClick={() => setActivePortal(portal.id)}
                  className={`p-4 rounded-xl transition-all duration-200 ${getColorClasses(portal.color, activePortal === portal.id)}`}
                >
                  <portal.icon className="w-8 h-8 mx-auto mb-2" />
                  <h3 className="font-semibold text-sm">{portal.name}</h3>
                  <p className="text-xs mt-1 opacity-80">{portal.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Login Form */}
          <div className="p-8">
            <div className="max-w-md mx-auto">
              <div className="text-center mb-6">
                <activePortalData.icon className={`w-12 h-12 mx-auto mb-3 text-${activePortalData.color}-600`} />
                <h3 className="text-2xl font-bold text-gray-900">{activePortalData.name}</h3>
                <p className="text-gray-600 mt-1">Sign in to access your dashboard</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {activePortal === 'student' && (
                  <>
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
                  </>
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
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Signing in...' : `Sign In to ${activePortalData.name}`}
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
      </div>
    </div>
  );
};

export default LoginPortal;