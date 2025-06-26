import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, TrendingUp, AlertTriangle, Upload, FileText, BarChart3, Shield, Settings, Eye } from 'lucide-react';
import { collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalQuizzes: 0,
    activeQuizzes: 0,
    totalAttempts: 0,
    totalQuestions: 0,
    securityViolations: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    // Real-time students data
    const studentsUnsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const students = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(user => user.role === 'student');
        
        const violations = students.reduce((sum, student) => sum + (student.tabSwitchCount || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalStudents: students.length,
          securityViolations: violations
        }));
      }
    );
    unsubscribes.push(studentsUnsubscribe);

    // Real-time quizzes data
    const quizzesUnsubscribe = onSnapshot(
      collection(db, 'quizzes'),
      (snapshot) => {
        const quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setStats(prev => ({
          ...prev,
          totalQuizzes: quizzes.length,
          activeQuizzes: quizzes.filter(q => q.isActive).length
        }));
      }
    );
    unsubscribes.push(quizzesUnsubscribe);

    // Real-time questions data
    const questionsUnsubscribe = onSnapshot(
      collection(db, 'questions'),
      (snapshot) => {
        setStats(prev => ({
          ...prev,
          totalQuestions: snapshot.docs.length
        }));
      }
    );
    unsubscribes.push(questionsUnsubscribe);

    // Real-time quiz results data
    const resultsUnsubscribe = onSnapshot(
      query(collection(db, 'quizResults'), orderBy('completedAt', 'desc')),
      (snapshot) => {
        const attempts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setStats(prev => ({
          ...prev,
          totalAttempts: attempts.length
        }));
        
        setRecentActivity(attempts.slice(0, 10));
        setLoading(false);
      }
    );
    unsubscribes.push(resultsUnsubscribe);

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const navigationItems = [
    { 
      name: 'Student Management', 
      icon: Users, 
      description: 'Manage students and monitor activity',
      link: '/admin/students',
      color: 'blue'
    },
    { 
      name: 'Quiz Management', 
      icon: BookOpen, 
      description: 'Create and manage quizzes',
      link: '/admin/quizzes',
      color: 'green'
    },
    { 
      name: 'Question Bank', 
      icon: Upload, 
      description: 'Upload and manage questions',
      link: '/admin/questions',
      color: 'purple'
    },
    { 
      name: 'Results Analytics', 
      icon: BarChart3, 
      description: 'View detailed analytics',
      link: '/admin/analytics',
      color: 'yellow'
    },
    { 
      name: 'Reports', 
      icon: FileText, 
      description: 'Generate and export reports',
      link: '/admin/reports',
      color: 'indigo'
    },
    { 
      name: 'Security Logs', 
      icon: AlertTriangle, 
      description: 'Monitor security violations',
      link: '/admin/security',
      color: 'red'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'border-blue-500 bg-blue-100 text-blue-600',
      green: 'border-green-500 bg-green-100 text-green-600',
      purple: 'border-purple-500 bg-purple-100 text-purple-600',
      yellow: 'border-yellow-500 bg-yellow-100 text-yellow-600',
      indigo: 'border-indigo-500 bg-indigo-100 text-indigo-600',
      red: 'border-red-500 bg-red-100 text-red-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage your quiz platform from here</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Students</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Quizzes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalQuizzes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeQuizzes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Attempts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-indigo-100">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Questions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalQuestions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Violations</p>
                <p className="text-2xl font-bold text-gray-900">{stats.securityViolations}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {navigationItems.map((item, index) => (
            <Link
              key={index}
              to={item.link}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-200 border-l-4 hover:scale-105 group"
              style={{ borderLeftColor: `var(--${item.color}-500)` }}
            >
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-full ${getColorClasses(item.color)}`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="ml-4 text-lg font-semibold text-gray-900 group-hover:text-gray-700">
                  {item.name}
                </h3>
              </div>
              <p className="text-gray-600 group-hover:text-gray-500">{item.description}</p>
            </Link>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Quiz Attempts</h2>
            <Link 
              to="/admin/analytics"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              <Eye className="w-4 h-4 mr-1" />
              View All
            </Link>
          </div>
          
          {recentActivity.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quiz
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentActivity.map((activity: any) => (
                    <tr key={activity.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {activity.studentEmail || 'Unknown Student'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {activity.quizTitle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          activity.score >= 80 ? 'bg-green-100 text-green-800' :
                          activity.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {activity.score}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {activity.completedAt?.toDate ? 
                          new Date(activity.completedAt.toDate()).toLocaleDateString() :
                          'N/A'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                          activity.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {activity.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
              <p className="mt-1 text-sm text-gray-500">
                Quiz attempts will appear here once students start taking quizzes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;