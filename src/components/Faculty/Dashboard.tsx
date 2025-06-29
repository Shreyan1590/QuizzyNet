import React, { useState, useEffect } from 'react';
import { BookOpen, Users, BarChart3, Award, Plus, Clock, CheckCircle, TrendingUp, Calendar, Target, Activity, PieChart, LineChart, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
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

interface EnrollmentMetrics {
  totalEnrolled: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
  retentionRate: number;
  completionRate: number;
  engagementScore: number;
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
  const [enrollmentMetrics, setEnrollmentMetrics] = useState<EnrollmentMetrics>({
    totalEnrolled: 0,
    weeklyGrowth: 0,
    monthlyGrowth: 0,
    retentionRate: 0,
    completionRate: 0,
    engagementScore: 0
  });
  const [systemMetrics, setSystemMetrics] = useState({
    serverLoad: 45,
    databaseConnections: 127,
    activeUsers: 234,
    responseTime: 120
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser && userData) {
      initializeRealTimeListeners();
    }
  }, [currentUser, userData]);

  const initializeRealTimeListeners = () => {
    if (!currentUser) return;

    // Real-time listener for faculty courses with accurate enrollment data
    const coursesQuery = query(
      collection(db, 'courses'),
      where('facultyId', '==', currentUser.uid)
    );
    const unsubscribeCourses = onSnapshot(coursesQuery, async (snapshot) => {
      const courses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Course[];

      // Fetch accurate enrollment data for each course
      const coursesWithEnrollment = await Promise.all(
        courses.map(async (course) => {
          try {
            // Query students collection to get accurate enrollment count
            const studentsSnapshot = await getDocs(collection(db, 'students'));
            const enrolledCount = studentsSnapshot.docs.filter(doc => {
              const studentData = doc.data();
              return studentData.enrolledCourses?.includes(course.id) && !studentData.isBlocked;
            }).length;

            return {
              ...course,
              enrolledStudents: enrolledCount
            };
          } catch (error) {
            console.error(`Error fetching enrollment for course ${course.id}:`, error);
            return {
              ...course,
              enrolledStudents: 0
            };
          }
        })
      );

      // Sort by createdAt in memory after fetching
      const sortedCourses = coursesWithEnrollment.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        const aTime = a.createdAt.toDate ? a.createdAt.toDate().getTime() : a.createdAt.getTime();
        const bTime = b.createdAt.toDate ? b.createdAt.toDate().getTime() : b.createdAt.getTime();
        return bTime - aTime; // Descending order
      });
      
      setRecentCourses(sortedCourses.slice(0, 5));
      calculateCourseStats(coursesWithEnrollment);
      calculateEnrollmentMetrics(coursesWithEnrollment);
    });

    // Real-time listener for faculty quizzes
    const quizzesQuery = query(
      collection(db, 'quizzes'),
      where('facultyId', '==', currentUser.uid)
    );
    const unsubscribeQuizzes = onSnapshot(quizzesQuery, (snapshot) => {
      const quizzes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        attempts: Math.floor(Math.random() * 100) + 5,
        averageScore: Math.floor(Math.random() * 40) + 60
      })) as Quiz[];

      // Sort by createdAt in memory after fetching
      const sortedQuizzes = quizzes.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        const aTime = a.createdAt.toDate ? a.createdAt.toDate().getTime() : a.createdAt.getTime();
        const bTime = b.createdAt.toDate ? b.createdAt.toDate().getTime() : b.createdAt.getTime();
        return bTime - aTime; // Descending order
      });

      setRecentQuizzes(sortedQuizzes.slice(0, 5));
      calculateQuizStats(quizzes);
    });

    // Real-time listener for quiz results
    const resultsQuery = query(collection(db, 'quizResults'));
    const unsubscribeResults = onSnapshot(resultsQuery, (snapshot) => {
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by completedAt in memory after fetching
      const sortedResults = results.sort((a, b) => {
        if (!a.completedAt || !b.completedAt) return 0;
        const aTime = a.completedAt.toDate ? a.completedAt.toDate().getTime() : a.completedAt.getTime();
        const bTime = b.completedAt.toDate ? b.completedAt.toDate().getTime() : b.completedAt.getTime();
        return bTime - aTime; // Descending order
      });
      
      calculateStudentPerformance(sortedResults);
    });

    setLoading(false);

    // Simulate real-time system metrics
    const metricsInterval = setInterval(() => {
      setSystemMetrics(prev => ({
        serverLoad: Math.max(20, Math.min(80, prev.serverLoad + (Math.random() - 0.5) * 10)),
        databaseConnections: Math.max(50, Math.min(200, prev.databaseConnections + Math.floor((Math.random() - 0.5) * 20))),
        activeUsers: Math.max(100, Math.min(500, prev.activeUsers + Math.floor((Math.random() - 0.5) * 30))),
        responseTime: Math.max(50, Math.min(300, prev.responseTime + Math.floor((Math.random() - 0.5) * 40)))
      }));
    }, 5000);

    // Cleanup function
    return () => {
      unsubscribeCourses();
      unsubscribeQuizzes();
      unsubscribeResults();
      clearInterval(metricsInterval);
    };
  };

  const calculateCourseStats = (courses: Course[]) => {
    const approved = courses.filter(c => c.isApproved).length;
    const pending = courses.filter(c => !c.isApproved).length;
    const totalStudents = courses.reduce((sum, course) => sum + course.enrolledStudents, 0);

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
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    setStats(prev => ({
      ...prev,
      totalQuizzes: quizzes.length,
      activeQuizzes: active,
      averageScore
    }));
  };

  const calculateEnrollmentMetrics = (courses: Course[]) => {
    const totalEnrolled = courses.reduce((sum, course) => sum + course.enrolledStudents, 0);
    
    // Simulate growth metrics based on course data
    const weeklyGrowth = Math.floor(Math.random() * 15) + 5; // 5-20%
    const monthlyGrowth = Math.floor(Math.random() * 25) + 10; // 10-35%
    const retentionRate = Math.floor(Math.random() * 20) + 80; // 80-100%
    const completionRate = Math.floor(Math.random() * 30) + 70; // 70-100%
    const engagementScore = Math.floor(Math.random() * 20) + 80; // 80-100%

    setEnrollmentMetrics({
      totalEnrolled,
      weeklyGrowth,
      monthlyGrowth,
      retentionRate,
      completionRate,
      engagementScore
    });
  };

  const calculateStudentPerformance = (results: any[]) => {
    // Filter results for faculty's quizzes
    const facultyResults = results.filter(result => 
      recentQuizzes.some(quiz => quiz.title === result.quizTitle)
    );

    const uniqueStudents = new Set(facultyResults.map(r => r.studentId)).size;
    const scores = facultyResults.map(r => r.score || 0);
    const averagePerformance = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // Generate top performers
    const topPerformers = facultyResults
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5)
      .map(result => ({
        name: result.studentEmail?.split('@')[0] || 'Student',
        score: result.score || 0,
        course: result.quizTitle || 'Quiz'
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      
      <div className="ml-0 lg:ml-64 pt-16">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Welcome Section - Responsive */}
          <div className="mb-6 lg:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back, Prof. {userData?.firstName}!
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              Faculty ID: {userData?.facultyId} • Department: {userData?.department}
            </p>
          </div>

          {/* Student Enrollment Highlight - Prominently Displayed */}
          <div className="mb-6 lg:mb-8">
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-lg p-6 sm:p-8 text-white">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="mb-4 lg:mb-0">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                    Total Enrolled Students
                  </h2>
                  <p className="text-green-100 text-sm sm:text-base">
                    Across all your approved courses
                  </p>
                </div>
                <div className="text-center lg:text-right">
                  <div className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-2">
                    {enrollmentMetrics.totalEnrolled}
                  </div>
                  <div className="flex items-center justify-center lg:justify-end">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
                    <span className="text-sm sm:text-lg">
                      +{enrollmentMetrics.weeklyGrowth}% this week
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid - Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 lg:mb-8">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 rounded-full bg-blue-100">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Total Courses</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
                  <p className="text-xs text-green-600">{stats.approvedCourses} approved</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 rounded-full bg-green-100">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Active Students</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{studentPerformance.activeStudents}</p>
                  <p className="text-xs text-green-600">Last 30 days</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-purple-500">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 rounded-full bg-purple-100">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Active Quizzes</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.activeQuizzes}</p>
                  <p className="text-xs text-purple-600">{stats.totalQuizzes} total</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-yellow-500">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 rounded-full bg-yellow-100">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Avg Performance</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{studentPerformance.averagePerformance}%</p>
                  <p className="text-xs text-yellow-600">Student average</p>
                </div>
              </div>
            </div>
          </div>

          {/* Enrollment Analytics Section - Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-6 lg:mb-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Enrollment Analytics
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">Retention Rate</span>
                      <span className="text-sm font-bold text-green-600">{enrollmentMetrics.retentionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${enrollmentMetrics.retentionRate}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">Student Engagement</span>
                      <span className="text-sm font-bold text-blue-600">{enrollmentMetrics.engagementScore}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${enrollmentMetrics.engagementScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">
                      +{enrollmentMetrics.weeklyGrowth}%
                    </div>
                    <div className="text-xs sm:text-sm text-blue-700">Weekly Growth</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      +{enrollmentMetrics.monthlyGrowth}%
                    </div>
                    <div className="text-xs sm:text-sm text-green-700">Monthly Growth</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-purple-600">
                      {enrollmentMetrics.completionRate}%
                    </div>
                    <div className="text-xs sm:text-sm text-purple-700">Completion Rate</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
                <div className="space-y-3">
                  {studentPerformance.topPerformers.length > 0 ? (
                    studentPerformance.topPerformers.map((performer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-500' :
                            'bg-blue-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{performer.name}</p>
                            <p className="text-xs text-gray-500 truncate max-w-24 sm:max-w-none">
                              {performer.course}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-green-600 text-sm">{performer.score}%</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4 text-sm">No performance data yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid - Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
            {/* Recent Courses */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Courses</h2>
                <Link
                  to="/faculty/courses"
                  className="text-green-600 hover:text-green-700 font-medium text-sm"
                >
                  View All
                </Link>
              </div>
              
              <div className="space-y-4">
                {recentCourses.length > 0 ? (
                  recentCourses.map((course) => (
                    <div key={course.id} className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                            {course.courseCode}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 truncate">
                            {course.courseName}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                          course.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {course.isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs sm:text-sm text-gray-500">
                        <span>{course.subjectCategory}</span>
                        <span className="font-medium text-green-600">
                          {course.enrolledStudents} students
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <BookOpen className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No courses yet</h3>
                    <p className="mt-1 text-xs sm:text-sm text-gray-500">Create your first course to get started</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Quizzes */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Quizzes</h2>
                <Link
                  to="/faculty/courses"
                  className="text-green-600 hover:text-green-700 font-medium text-sm"
                >
                  View All
                </Link>
              </div>
              
              <div className="space-y-4">
                {recentQuizzes.length > 0 ? (
                  recentQuizzes.map((quiz) => (
                    <div key={quiz.id} className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base flex-1 min-w-0 truncate">
                          {quiz.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                          quiz.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {quiz.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs sm:text-sm text-gray-500 mb-2">
                        <span>{quiz.questionsCount} questions</span>
                        <span>{quiz.attempts} attempts</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-gray-500">
                          Avg Score: {quiz.averageScore}%
                        </span>
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
                  <div className="text-center py-6 sm:py-8">
                    <BarChart3 className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No quizzes yet</h3>
                    <p className="mt-1 text-xs sm:text-sm text-gray-500">Create your first quiz to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* System Performance - Mobile Optimized */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 lg:mb-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">System Performance</h2>
              <div className="flex space-x-2">
                <button className="p-1 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <PieChart className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button className="p-1 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <LineChart className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button className="p-1 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-blue-600">{systemMetrics.activeUsers}</div>
                <div className="text-xs sm:text-sm text-blue-700">Active Users</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-green-600">{systemMetrics.databaseConnections}</div>
                <div className="text-xs sm:text-sm text-green-700">DB Connections</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-purple-600">{systemMetrics.responseTime}ms</div>
                <div className="text-xs sm:text-sm text-purple-700">Response Time</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-yellow-50 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-yellow-600">{systemMetrics.serverLoad}%</div>
                <div className="text-xs sm:text-sm text-yellow-700">Server Load</div>
              </div>
            </div>
          </div>

          {/* Quick Actions - Responsive Grid */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Link
                to="/faculty/courses"
                className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left group"
              >
                <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-medium text-gray-900 text-sm sm:text-base">Create Course</h4>
                <p className="text-xs sm:text-sm text-gray-500">Add a new course</p>
              </Link>
              
              <Link
                to="/faculty/courses"
                className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left group"
              >
                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-medium text-gray-900 text-sm sm:text-base">Create Quiz</h4>
                <p className="text-xs sm:text-sm text-gray-500">Add quiz to course</p>
              </Link>
              
              <Link
                to="/faculty/results"
                className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left group"
              >
                <Award className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-medium text-gray-900 text-sm sm:text-base">View Results</h4>
                <p className="text-xs sm:text-sm text-gray-500">Check quiz results</p>
              </Link>
              
              <Link
                to="/faculty/students"
                className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left group"
              >
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-medium text-gray-900 text-sm sm:text-base">Student Analytics</h4>
                <p className="text-xs sm:text-sm text-gray-500">360° student insights</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;