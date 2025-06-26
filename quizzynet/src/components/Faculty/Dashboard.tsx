import React, { useState, useEffect } from 'react';
import { BookOpen, Users, BarChart3, Award, Plus, Clock, CheckCircle, TrendingUp, Calendar, Target } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';

interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  subjectCategory: string;
  courseCategory: string;
  facultyId: string;
  isApproved: boolean;
  enrolledStudents: number;
  createdAt: any;
}

interface Quiz {
  id: string;
  title: string;
  courseId: string;
  isActive: boolean;
  questionsCount: number;
  scheduledAt: any;
  createdAt: any;
  attempts: number;
  averageScore: number;
}

interface StudentPerformance {
  totalStudents: number;
  activeStudents: number;
  averagePerformance: number;
  topPerformers: Array<{
    name: string;
    score: number;
    course: string;
  }>;
}

const FacultyDashboard: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [stats, setStats] = useState({
    totalCourses: 0,
    approvedCourses: 0,
    pendingCourses: 0,
    totalQuizzes: 0,
    activeQuizzes: 0,
    totalStudents: 0,
    averageScore: 0
  });
  const [recentCourses, setRecentCourses] = useState<Course[]>([]);
  const [recentQuizzes, setRecentQuizzes] = useState<Quiz[]>([]);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance>({
    totalStudents: 0,
    activeStudents: 0,
    averagePerformance: 0,
    topPerformers: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser && userData) {
      const unsubscribe = initializeRealTimeListeners();
      return () => unsubscribe();
    }
  }, [currentUser, userData]);

  const initializeRealTimeListeners = () => {
    const unsubscribeFunctions: (() => void)[] = [];
    
    try {
      // Courses listener
      const coursesQuery = query(
        collection(db, 'courses'),
        where('facultyId', '==', currentUser?.uid),
        orderBy('createdAt', 'desc')
      );
      const unsubscribeCourses = onSnapshot(coursesQuery, 
        (snapshot) => {
          const courses = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            enrolledStudents: doc.data().enrolledStudents || 0
          })) as Course[];
          setRecentCourses(courses.slice(0, 5));
          calculateCourseStats(courses);
        },
        (err) => {
          setError('Failed to load courses');
          console.error('Courses listener error:', err);
        }
      );
      unsubscribeFunctions.push(unsubscribeCourses);

      // Quizzes listener
      const quizzesQuery = query(
        collection(db, 'quizzes'),
        where('facultyId', '==', currentUser?.uid),
        orderBy('createdAt', 'desc')
      );
      const unsubscribeQuizzes = onSnapshot(quizzesQuery, 
        (snapshot) => {
          const quizzes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            attempts: doc.data().attempts || 0,
            averageScore: doc.data().averageScore || 0
          })) as Quiz[];
          setRecentQuizzes(quizzes.slice(0, 5));
          calculateQuizStats(quizzes);
        },
        (err) => {
          setError('Failed to load quizzes');
          console.error('Quizzes listener error:', err);
        }
      );
      unsubscribeFunctions.push(unsubscribeQuizzes);

      // Results listener
      const resultsQuery = query(
        collection(db, 'quizResults'),
        where('facultyId', '==', currentUser?.uid),
        orderBy('completedAt', 'desc')
      );
      const unsubscribeResults = onSnapshot(resultsQuery, 
        (snapshot) => {
          const results = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }));
          calculateStudentPerformance(results);
        },
        (err) => {
          setError('Failed to load results');
          console.error('Results listener error:', err);
        }
      );
      unsubscribeFunctions.push(unsubscribeResults);

      setLoading(false);
    } catch (err) {
      setError('Failed to initialize dashboard');
      setLoading(false);
    }

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  };

  const calculateCourseStats = (courses: Course[]) => {
    const approved = courses.filter(c => c.isApproved).length;
    const pending = courses.filter(c => !c.isApproved).length;
    const totalStudents = courses.reduce((sum, course) => sum + (course.enrolledStudents || 0), 0);

    setStats(prev => ({
      ...prev,
      totalCourses: courses.length,
      approvedCourses: approved,
      pendingCourses: pending,
      totalStudents
    }));
  };

  const calculateQuizStats = (quizzes: Quiz[]) => {
    const active = quizzes.filter(q => q.isActive).length;
    const scores = quizzes.map(q => q.averageScore || 0);
    const averageScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    setStats(prev => ({
      ...prev,
      totalQuizzes: quizzes.length,
      activeQuizzes: active,
      averageScore
    }));
  };

  const calculateStudentPerformance = (results: any[]) => {
    if (!results.length) return;

    const uniqueStudents = new Set(results.map(r => r.studentId)).size;
    const scores = results.map(r => r.score || 0);
    const averagePerformance = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    const topPerformers = results
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5)
      .map(result => ({
        name: result.studentName || result.studentEmail?.split('@')[0] || 'Student',
        score: result.score || 0,
        course: result.courseName || 'Quiz'
      }));

    setStudentPerformance({
      totalStudents: uniqueStudents,
      activeStudents: Math.floor(uniqueStudents * 0.8),
      averagePerformance,
      topPerformers
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />
        <div className="ml-64 pt-16 flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />
        <div className="ml-64 pt-16 flex items-center justify-center h-screen">
          <div className="text-center p-4 bg-red-50 rounded-lg max-w-md">
            <h3 className="text-lg font-medium text-red-800">Error</h3>
            <p className="mt-2 text-red-600">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {userData?.firstName}!</h1>
            <p className="mt-2 text-gray-600">Faculty ID: {userData?.facultyId} • Department: {userData?.department}</p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Courses</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
                  <p className="text-xs text-green-600">{stats.approvedCourses} approved</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                  <p className="text-xs text-green-600">{studentPerformance.activeStudents} active</p>
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
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Avg Performance</p>
                  <p className="text-2xl font-bold text-gray-900">{studentPerformance.averagePerformance}%</p>
                  <p className="text-xs text-yellow-600">Student average</p>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Teaching Analytics</h2>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">Course Completion Rate</span>
                      <span className="text-sm font-bold text-green-600">{analytics.completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${analytics.completionRate}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">Student Engagement</span>
                      <span className="text-sm font-bold text-blue-600">{analytics.engagementScore}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${analytics.engagementScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{analytics.weeklyQuizzes}</div>
                    <div className="text-sm text-blue-700">Quizzes This Week</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.pendingCourses}</div>
                    <div className="text-sm text-green-700">Pending Approval</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{stats.averageScore}%</div>
                    <div className="text-sm text-purple-700">Quiz Average</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
                <div className="space-y-3">
                  {studentPerformance.topPerformers.length > 0 ? (
                    studentPerformance.topPerformers.map((performer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-500' :
                            'bg-blue-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{performer.name}</p>
                            <p className="text-sm text-gray-500">{performer.course}</p>
                          </div>
                        </div>
                        <span className="font-bold text-green-600">{performer.score}%</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No performance data yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Courses */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Recent Courses</h2>
                <Link
                  to="/faculty/courses"
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  View All
                </Link>
              </div>
              
              <div className="space-y-4">
                {recentCourses.length > 0 ? (
                  recentCourses.map((course) => (
                    <div key={course.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{course.courseCode}</h3>
                          <p className="text-sm text-gray-600">{course.courseName}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          course.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {course.isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>{course.subjectCategory}</span>
                        <span>{course.enrolledStudents} students</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No courses yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Create your first course to get started</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Quizzes */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Recent Quizzes</h2>
                <Link
                  to="/faculty/courses"
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  View All
                </Link>
              </div>
              
              <div className="space-y-4">
                {recentQuizzes.length > 0 ? (
                  recentQuizzes.map((quiz) => (
                    <div key={quiz.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          quiz.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {quiz.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                        <span>{quiz.questionsCount} questions</span>
                        <span>{quiz.attempts} attempts</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Avg Score: {quiz.averageScore}%</span>
                        <span className="text-xs text-gray-400">
                          {quiz.scheduledAt ? 
                            new Date(quiz.scheduledAt.toDate()).toLocaleDateString() :
                            'No schedule'
                          }
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No quizzes yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Create your first quiz to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link
                to="/faculty/courses"
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left group"
              >
                <Plus className="w-8 h-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-medium text-gray-900">Create Course</h4>
                <p className="text-sm text-gray-500">Add a new course</p>
              </Link>
              
              <Link
                to="/faculty/courses"
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left group"
              >
                <BarChart3 className="w-8 h-8 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-medium text-gray-900">Create Quiz</h4>
                <p className="text-sm text-gray-500">Add quiz to course</p>
              </Link>
              
              <Link
                to="/faculty/results"
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left group"
              >
                <Award className="w-8 h-8 text-yellow-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-medium text-gray-900">View Results</h4>
                <p className="text-sm text-gray-500">Check quiz results</p>
              </Link>
              
              <Link
                to="/faculty/students"
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left group"
              >
                <Users className="w-8 h-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-medium text-gray-900">Student Analytics</h4>
                <p className="text-sm text-gray-500">360° student insights</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;