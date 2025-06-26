import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, TrendingUp, AlertTriangle, Upload, FileText, BarChart3, Shield, Settings, Eye, PieChart, LineChart, Activity } from 'lucide-react';
import { collection, getDocs, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    totalCourses: 0,
    approvedCourses: 0,
    pendingCourses: 0,
    totalQuizzes: 0,
    activeQuizzes: 0,
    totalAttempts: 0,
    totalQuestions: 0,
    securityViolations: 0,
    systemHealth: 98
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState({
    serverLoad: 45,
    databaseConnections: 127,
    activeUsers: 234,
    responseTime: 120
  });
  const [chartData, setChartData] = useState({
    userGrowth: [65, 78, 90, 81, 95, 102, 118],
    quizPerformance: [72, 68, 85, 79, 88, 92, 87],
    courseEnrollments: [45, 52, 48, 61, 55, 67, 73]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeRealTimeListeners();
  }, []);

  const initializeRealTimeListeners = () => {
    // Real-time students data
    const studentsUnsubscribe = onSnapshot(
      collection(db, 'students'),
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

    // Real-time faculty data
    const facultyUnsubscribe = onSnapshot(
      collection(db, 'faculty'),
      (snapshot) => {
        const faculty = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setStats(prev => ({
          ...prev,
          totalFaculty: faculty.length
        }));
      }
    );

    // Real-time courses data
    const coursesUnsubscribe = onSnapshot(
      collection(db, 'courses'),
      (snapshot) => {
        const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const approved = courses.filter(c => c.isApproved).length;
        const pending = courses.filter(c => !c.isApproved).length;
        
        setStats(prev => ({
          ...prev,
          totalCourses: courses.length,
          approvedCourses: approved,
          pendingCourses: pending
        }));
      }
    );

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

    // Simulate real-time system metrics
    const metricsInterval = setInterval(() => {
      setSystemMetrics(prev => ({
        serverLoad: Math.max(20, Math.min(80, prev.serverLoad + (Math.random() - 0.5) * 10)),
        databaseConnections: Math.max(50, Math.min(200, prev.databaseConnections + Math.floor((Math.random() - 0.5) * 20))),
        activeUsers: Math.max(100, Math.min(500, prev.activeUsers + Math.floor((Math.random() - 0.5) * 30))),
        responseTime: Math.max(50, Math.min(300, prev.responseTime + Math.floor((Math.random() - 0.5) * 40)))
      }));
    }, 5000);

    return () => {
      studentsUnsubscribe();
      facultyUnsubscribe();
      coursesUnsubscribe();
      quizzesUnsubscribe();
      questionsUnsubscribe();
      resultsUnsubscribe();
      clearInterval(metricsInterval);
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />
        <div className="ml-64 pt-16 flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
          </div>
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
      color: 'blue',
      count: stats.totalStudents
    },
    { 
      name: 'Course Management', 
      icon: BookOpen, 
      description: 'Approve and manage courses',
      link: '/admin/courses',
      color: 'green',
      count: stats.pendingCourses
    },
    { 
      name: 'Quiz Management', 
      icon: BarChart3, 
      description: 'Control quiz schedules',
      link: '/admin/quizzes',
      color: 'purple',
      count: stats.activeQuizzes
    },
    { 
      name: 'Analytics Dashboard', 
      icon: TrendingUp, 
      description: 'View detailed analytics',
      link: '/admin/analytics',
      color: 'yellow',
      count: stats.totalAttempts
    },
    { 
      name: 'Reports Generator', 
      icon: FileText, 
      description: 'Generate and export reports',
      link: '/admin/reports',
      color: 'indigo',
      count: 0
    },
    { 
      name: 'Security Center', 
      icon: AlertTriangle, 
      description: 'Monitor security violations',
      link: '/admin/security',
      color: 'red',
      count: stats.securityViolations
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'border-blue-500 bg-blue-100 text-blue-600 hover:bg-blue-200',
      green: 'border-green-500 bg-green-100 text-green-600 hover:bg-green-200',
      purple: 'border-purple-500 bg-purple-100 text-purple-600 hover:bg-purple-200',
      yellow: 'border-yellow-500 bg-yellow-100 text-yellow-600 hover:bg-yellow-200',
      indigo: 'border-indigo-500 bg-indigo-100 text-indigo-600 hover:bg-indigo-200',
      red: 'border-red-500 bg-red-100 text-red-600 hover:bg-red-200'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">System Administration</h1>
            <p className="mt-2 text-gray-600">Comprehensive learning management system control center</p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
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

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Courses</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
                  <p className="text-xs text-green-600">{stats.approvedCourses} approved</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Quizzes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeQuizzes}</p>
                  <p className="text-xs text-purple-600">{stats.totalQuizzes} total</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Quiz Attempts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-indigo-500">
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

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-red-100">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Security Issues</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.securityViolations}</p>
                </div>
              </div>
            </div>
          </div>

          {/* System Health & Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">System Performance</h2>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">Server Load</span>
                      <span className="text-sm font-bold text-blue-600">{systemMetrics.serverLoad}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          systemMetrics.serverLoad > 70 ? 'bg-red-600' :
                          systemMetrics.serverLoad > 50 ? 'bg-yellow-600' :
                          'bg-green-600'
                        }`}
                        style={{ width: `${systemMetrics.serverLoad}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">System Health</span>
                      <span className="text-sm font-bold text-green-600">{stats.systemHealth}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stats.systemHealth}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{systemMetrics.activeUsers}</div>
                    <div className="text-sm text-blue-700">Active Users</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{systemMetrics.databaseConnections}</div>
                    <div className="text-sm text-green-700">DB Connections</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{systemMetrics.responseTime}ms</div>
                    <div className="text-sm text-purple-700">Response Time</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Analytics</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Faculty Members</span>
                    <span className="font-semibold text-gray-900">{stats.totalFaculty}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pending Approvals</span>
                    <span className="font-semibold text-yellow-600">{stats.pendingCourses}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Security Alerts</span>
                    <span className="font-semibold text-red-600">{stats.securityViolations}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">System Uptime</span>
                    <span className="font-semibold text-green-600">99.9%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Management Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {navigationItems.map((item, index) => (
              <Link
                key={index}
                to={item.link}
                className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-200 border-l-4 hover:scale-105 group ${getColorClasses(item.color)}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-full ${getColorClasses(item.color)}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  {item.count > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {item.count}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700 mb-2">
                  {item.name}
                </h3>
                <p className="text-gray-600 group-hover:text-gray-500 text-sm">{item.description}</p>
              </Link>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recent System Activity</h2>
              <div className="flex space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <PieChart className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <LineChart className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Activity className="w-5 h-5" />
                </button>
              </div>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 mr-3">
                            <Eye className="w-4 h-4" />
                          </button>
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
                  System activity will appear here once users start interacting with the platform.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;