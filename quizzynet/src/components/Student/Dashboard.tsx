import React, { useState, useEffect } from 'react';
import { Clock, BookOpen, Award, TrendingUp, PlayCircle, History, Users, BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Link } from 'react-router-dom';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';

interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  subjectCategory: string;
  courseCategory: string;
  facultyId: string;
  facultyName: string;
  isApproved: boolean;
  progress?: number;
  grade?: string;
  status: 'enrolled' | 'completed' | 'in-progress';
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseName: string;
  duration: number;
  questionsCount: number;
  isActive: boolean;
  scheduledAt: any;
  dueDate: any;
  createdAt: any;
}

interface QuizResult {
  id: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completedAt: any;
  status: string;
  timeSpent: number;
}

const StudentDashboard: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [stats, setStats] = useState({
    enrolledCourses: 0,
    completedCourses: 0,
    availableQuizzes: 0,
    completedQuizzes: 0,
    averageScore: 0,
    totalStudyTime: 0,
    upcomingDeadlines: 0,
    currentGPA: 0
  });
  const [currentCourses, setCurrentCourses] = useState<Course[]>([]);
  const [completedCourses, setCompletedCourses] = useState<Course[]>([]);
  const [upcomingQuizzes, setUpcomingQuizzes] = useState<Quiz[]>([]);
  const [recentResults, setRecentResults] = useState<QuizResult[]>([]);
  const [learningProgress, setLearningProgress] = useState({
    weeklyProgress: 0,
    monthlyProgress: 0,
    streakDays: 0,
    completionRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser && userData) {
      initializeRealTimeListeners();
    }
  }, [currentUser, userData]);

  const initializeRealTimeListeners = () => {
    if (!currentUser || !userData) return;

    const studentDocRef = doc(db, 'students', currentUser.uid);
    const unsubscribeStudent = onSnapshot(studentDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        updateLearningProgress(data);
      }
    });

    const coursesQuery = query(
      collection(db, 'courses'),
      where('isApproved', '==', true)
    );
    const unsubscribeCourses = onSnapshot(coursesQuery, (snapshot) => {
      const allCourses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Course[];
      processCourseData(allCourses);
    });

    const quizzesQuery = query(
      collection(db, 'quizzes'),
      where('isActive', '==', true),
      orderBy('scheduledAt', 'asc')
    );
    const unsubscribeQuizzes = onSnapshot(quizzesQuery, (snapshot) => {
      const quizzes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Quiz[];
      processQuizData(quizzes);
    });

    const resultsQuery = query(
      collection(db, 'quizResults'),
      where('studentId', '==', currentUser.uid),
      orderBy('completedAt', 'desc')
    );
    const unsubscribeResults = onSnapshot(resultsQuery, (snapshot) => {
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as QuizResult[];
      setRecentResults(results.slice(0, 5));
      calculatePerformanceStats(results);
    });

    setLoading(false);

    return () => {
      unsubscribeStudent();
      unsubscribeCourses();
      unsubscribeQuizzes();
      unsubscribeResults();
    };
  };

  const processCourseData = (allCourses: Course[]) => {
    const enrolledCourseIds = userData?.enrolledCourses || [];
    const completedCourseIds = userData?.completedCourses || [];

    const enrolled = allCourses.filter(course => 
      enrolledCourseIds.includes(course.id)
    ).map(course => ({
      ...course,
      status: 'enrolled' as const,
      progress: Math.floor(Math.random() * 100)
    }));

    const completed = allCourses.filter(course => 
      completedCourseIds.includes(course.id)
    ).map(course => ({
      ...course,
      status: 'completed' as const,
      progress: 100,
      grade: ['A+', 'A', 'A-', 'B+', 'B'][Math.floor(Math.random() * 5)]
    }));

    setCurrentCourses(enrolled);
    setCompletedCourses(completed);
  };

  const processQuizData = (quizzes: Quiz[]) => {
    const enrolledCourseIds = userData?.enrolledCourses || [];
    const relevantQuizzes = quizzes.filter(quiz => 
      enrolledCourseIds.includes(quiz.courseId)
    );

    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const upcoming = relevantQuizzes.filter(quiz => {
      if (!quiz.scheduledAt) return true;
      const scheduledDate = quiz.scheduledAt.toDate();
      return scheduledDate >= now && scheduledDate <= nextWeek;
    });

    setUpcomingQuizzes(upcoming);
    setStats(prev => ({ ...prev, upcomingDeadlines: upcoming.length }));
  };

  const calculatePerformanceStats = (results: QuizResult[]) => {
    if (results.length === 0) return;

    const scores = results.map(r => r.score || 0);
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const totalStudyTime = results.reduce((sum, r) => sum + (r.timeSpent || 0), 0);

    setStats(prev => ({
      ...prev,
      completedQuizzes: results.length,
      averageScore,
      totalStudyTime: Math.round(totalStudyTime / 60)
    }));
  };

  const updateLearningProgress = (studentData: any) => {
    const progress = studentData.learningProgress || {};
    
    setLearningProgress({
      weeklyProgress: progress.weeklyProgress || 0,
      monthlyProgress: progress.monthlyProgress || 0,
      streakDays: progress.streakDays || 0,
      completionRate: progress.completionRate || 0
    });

    setStats(prev => ({
      ...prev,
      enrolledCourses: studentData.enrolledCourses?.length || 0,
      completedCourses: studentData.completedCourses?.length || 0,
      currentGPA: progress.currentGPA || 0
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />
        <div className="ml-64 pt-16 flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {userData?.firstName}!</h1>
            <p className="mt-2 text-gray-600">Registration: {userData?.registrationNumber} • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Current Courses</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.enrolledCourses}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedCourses}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Average Score</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100">
                  <Target className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Current GPA</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.currentGPA.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Learning Progress Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Learning Progress</h2>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">Weekly Progress</span>
                      <span className="text-sm font-bold text-blue-600">{learningProgress.weeklyProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${learningProgress.weeklyProgress}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">Monthly Progress</span>
                      <span className="text-sm font-bold text-green-600">{learningProgress.monthlyProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${learningProgress.monthlyProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{learningProgress.streakDays}</div>
                    <div className="text-sm text-blue-700">Day Streak</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{learningProgress.completionRate}%</div>
                    <div className="text-sm text-green-700">Completion Rate</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{stats.totalStudyTime}</div>
                    <div className="text-sm text-purple-700">Study Minutes</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Quizzes Completed</span>
                    <span className="font-semibold text-gray-900">{stats.completedQuizzes}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Upcoming Deadlines</span>
                    <span className="font-semibold text-red-600">{stats.upcomingDeadlines}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Study Time (hrs)</span>
                    <span className="font-semibold text-gray-900">{Math.round(stats.totalStudyTime / 60)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Current Courses */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Current Courses</h2>
                <Link to="/student/courses" className="text-blue-600 hover:text-blue-700 font-medium">
                  View All
                </Link>
              </div>
              
              <div className="space-y-4">
                {currentCourses.length > 0 ? (
                  currentCourses.slice(0, 3).map((course) => (
                    <div key={course.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{course.courseCode}</h3>
                          <p className="text-sm text-gray-600">{course.courseName}</p>
                        </div>
                        <span className="text-sm font-medium text-blue-600">{course.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>Faculty: {course.facultyName}</span>
                        <span>{course.subjectCategory}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No current courses</h3>
                    <p className="mt-1 text-sm text-gray-500">Enroll in courses to start learning</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Quizzes */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Upcoming Quizzes</h2>
                <Link to="/student/quiz" className="text-blue-600 hover:text-blue-700 font-medium">
                  View All
                </Link>
              </div>
              
              <div className="space-y-4">
                {upcomingQuizzes.length > 0 ? (
                  upcomingQuizzes.slice(0, 3).map((quiz) => (
                    <div key={quiz.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          {quiz.scheduledAt ? 
                            new Date(quiz.scheduledAt.toDate()).toLocaleDateString() : 
                            'Available Now'
                          }
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{quiz.description}</p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {quiz.duration} min
                          </span>
                          <span>{quiz.questionsCount} questions</span>
                        </div>
                        <Link
                          to={`/quiz/${quiz.id}`}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Start
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <PlayCircle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming quizzes</h3>
                    <p className="mt-1 text-sm text-gray-500">Check back later for new quizzes</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Results */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Recent Results</h2>
                <History className="w-6 h-6 text-green-600" />
              </div>
              
              <div className="space-y-4">
                {recentResults.length > 0 ? (
                  recentResults.map((result) => (
                    <div key={result.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">{result.quizTitle}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          result.score >= 90 ? 'bg-green-100 text-green-800' :
                          result.score >= 70 ? 'bg-blue-100 text-blue-800' :
                          result.score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {result.score}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>{result.correctAnswers}/{result.totalQuestions} correct</span>
                        <span>
                          {result.completedAt?.toDate ? 
                            new Date(result.completedAt.toDate()).toLocaleDateString() :
                            'N/A'
                          }
                        </span>
                      </div>
                      <div className="mt-2">
                        <Link
                          to={`/results/${result.id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No results yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Take your first quiz to see results</p>
                  </div>
                )}
              </div>
            </div>

            {/* Completed Courses */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Completed Courses</h2>
                <Award className="w-6 h-6 text-green-600" />
              </div>
              
              <div className="space-y-4">
                {completedCourses.length > 0 ? (
                  completedCourses.slice(0, 3).map((course) => (
                    <div key={course.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{course.courseCode}</h3>
                          <p className="text-sm text-gray-600">{course.courseName}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          course.grade?.startsWith('A') ? 'bg-green-100 text-green-800' :
                          course.grade?.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          Grade: {course.grade}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>Faculty: {course.facultyName}</span>
                        <span className="text-green-600 font-medium">Completed</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Award className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No completed courses</h3>
                    <p className="mt-1 text-sm text-gray-500">Complete courses to see them here</p>
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
                to="/student/courses"
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left group"
              >
                <BookOpen className="w-8 h-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-medium text-gray-900">My Courses</h4>
                <p className="text-sm text-gray-500">View enrolled courses</p>
              </Link>
              
              <Link
                to="/student/enrollment"
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left group"
              >
                <Users className="w-8 h-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-medium text-gray-900">Enrollment</h4>
                <p className="text-sm text-gray-500">Enroll in new courses</p>
              </Link>
              
              <Link
                to="/student/quiz"
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left group"
              >
                <PlayCircle className="w-8 h-8 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-medium text-gray-900">Take Quiz</h4>
                <p className="text-sm text-gray-500">Start a new quiz</p>
              </Link>
              
              <Link
                to="/student/profile"
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left group"
              >
                <Target className="w-8 h-8 text-yellow-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-medium text-gray-900">My Profile</h4>
                <p className="text-sm text-gray-500">Update information</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;