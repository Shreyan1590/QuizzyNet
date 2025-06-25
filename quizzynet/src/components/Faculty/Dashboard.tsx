import React, { useState, useEffect } from 'react';
import { BookOpen, Users, BarChart3, Award, Plus, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
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
  createdAt: any;
}

interface Quiz {
  id: string;
  title: string;
  courseId: string;
  isActive: boolean;
  questionsCount: number;
  createdAt: any;
}

const FacultyDashboard: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [stats, setStats] = useState({
    totalCourses: 0,
    approvedCourses: 0,
    totalQuizzes: 0,
    activeQuizzes: 0
  });
  const [recentCourses, setRecentCourses] = useState<Course[]>([]);
  const [recentQuizzes, setRecentQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser && userData) {
      fetchDashboardData();
    }
  }, [currentUser, userData]);

  const fetchDashboardData = async () => {
    if (!currentUser) return;

    try {
      // Fetch faculty courses
      const coursesQuery = query(
        collection(db, 'courses'),
        where('facultyId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const coursesSnapshot = await getDocs(coursesQuery);
      const courses = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Course[];

      setRecentCourses(courses.slice(0, 5));

      // Fetch faculty quizzes
      const quizzesQuery = query(
        collection(db, 'quizzes'),
        where('facultyId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const quizzesSnapshot = await getDocs(quizzesQuery);
      const quizzes = quizzesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Quiz[];

      setRecentQuizzes(quizzes.slice(0, 5));

      // Calculate stats
      const approvedCourses = courses.filter(c => c.isApproved).length;
      const activeQuizzes = quizzes.filter(q => q.isActive).length;

      setStats({
        totalCourses: courses.length,
        approvedCourses,
        totalQuizzes: quizzes.length,
        activeQuizzes
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error loading dashboard data');
    } finally {
      setLoading(false);
    }
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
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {userData?.firstName}!</h1>
            <p className="mt-2 text-gray-600">Faculty ID: {userData?.facultyId}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Courses</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Approved Courses</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.approvedCourses}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Quizzes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalQuizzes}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100">
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Quizzes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeQuizzes}</p>
                </div>
              </div>
            </div>
          </div>

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
                        <h3 className="font-semibold text-gray-900">{course.courseCode}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          course.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {course.isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{course.courseName}</p>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>{course.subjectCategory}</span>
                        <span>
                          {course.createdAt?.toDate ? 
                            new Date(course.createdAt.toDate()).toLocaleDateString() :
                            'N/A'
                          }
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No courses yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Create your first course to get started.
                    </p>
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
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>{quiz.questionsCount} questions</span>
                        <span>
                          {quiz.createdAt?.toDate ? 
                            new Date(quiz.createdAt.toDate()).toLocaleDateString() :
                            'N/A'
                          }
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No quizzes yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Create your first quiz to get started.
                    </p>
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
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
              >
                <Plus className="w-8 h-8 text-green-600 mb-2" />
                <h4 className="font-medium text-gray-900">Create Course</h4>
                <p className="text-sm text-gray-500">Add a new course</p>
              </Link>
              
              <Link
                to="/faculty/courses"
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
              >
                <BarChart3 className="w-8 h-8 text-purple-600 mb-2" />
                <h4 className="font-medium text-gray-900">Create Quiz</h4>
                <p className="text-sm text-gray-500">Add quiz to course</p>
              </Link>
              
              <Link
                to="/faculty/results"
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
              >
                <Award className="w-8 h-8 text-yellow-600 mb-2" />
                <h4 className="font-medium text-gray-900">View Results</h4>
                <p className="text-sm text-gray-500">Check quiz results</p>
              </Link>
              
              <Link
                to="/faculty/students"
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
              >
                <Users className="w-8 h-8 text-blue-600 mb-2" />
                <h4 className="font-medium text-gray-900">Student View</h4>
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