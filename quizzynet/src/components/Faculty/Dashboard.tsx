import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Users, BarChart3, Award, Plus, Clock, 
  CheckCircle, TrendingUp, Calendar, Target, UserCheck, UserX 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  collection, query, where, orderBy, onSnapshot, 
  doc, updateDoc, getDocs, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface Course {
  id: string;
  courseCode: string;
  extendedCode: string;
  courseName: string;
  subjectCategory: string;
  courseCategory: string;
  facultyId: string;
  facultyName: string;
  isApproved: boolean;
  enrolledStudents: number;
  pendingApprovals: string[]; // student IDs
  createdAt: any;
}

interface Quiz {
  id: string;
  title: string;
  courseId: string;
  courseCode: string;
  facultyId: string;
  isActive: boolean;
  questionsCount: number;
  scheduledAt: any;
  duration: number; // in minutes
  createdAt: any;
  attempts: number;
  averageScore: number;
  status: 'scheduled' | 'ongoing' | 'completed';
}

interface Student {
  id: string;
  name: string;
  email: string;
  enrolledCourses: string[]; // course IDs
}

interface QuizResult {
  id: string;
  quizId: string;
  courseId: string;
  studentId: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  submittedAt: any | null;
  status: 'completed' | 'absent' | 'pending';
}

const FacultyDashboard: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [stats, setStats] = useState({
    totalCourses: 0,
    approvedCourses: 0,
    pendingCourses: 0,
    totalQuizzes: 0,
    activeQuizzes: 0,
    upcomingQuizzes: 0,
    totalStudents: 0,
    pendingApprovals: 0,
    averageScore: 0
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [subjectCategories, setSubjectCategories] = useState<{code: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize real-time listeners
  useEffect(() => {
    if (!currentUser || !userData) {
      setLoading(false);
      return;
    }

    const unsubscribeFunctions: (() => void)[] = [];

    // Load subject categories (common course codes)
    const loadSubjectCategories = async () => {
      try {
        const q = query(collection(db, 'subjectCategories'));
        const querySnapshot = await getDocs(q);
        const categories = querySnapshot.docs.map(doc => doc.data() as {code: string, name: string});
        setSubjectCategories(categories);
      } catch (error) {
        console.error('Error loading subject categories:', error);
      }
    };
    loadSubjectCategories();

    // Courses listener
    const coursesQuery = query(
      collection(db, 'courses'),
      where('facultyId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribeCourses = onSnapshot(
      coursesQuery,
      (snapshot) => {
        const coursesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          enrolledStudents: doc.data().enrolledStudents || 0,
          pendingApprovals: doc.data().pendingApprovals || []
        })) as Course[];
        
        setCourses(coursesData);
        calculateCourseStats(coursesData);
      },
      (error) => {
        console.error('Courses listener error:', error);
        setError('Failed to load courses data');
      }
    );
    unsubscribeFunctions.push(unsubscribeCourses);

    // Quizzes listener
    const quizzesQuery = query(
      collection(db, 'quizzes'),
      where('facultyId', '==', currentUser.uid),
      orderBy('scheduledAt', 'desc')
    );
    
    const unsubscribeQuizzes = onSnapshot(
      quizzesQuery,
      (snapshot) => {
        const quizzesData = snapshot.docs.map(doc => {
          const quizData = doc.data();
          const now = new Date();
          const scheduledAt = quizData.scheduledAt?.toDate();
          let status: Quiz['status'] = 'scheduled';
          
          if (scheduledAt) {
            if (now > scheduledAt) {
              const endTime = new Date(scheduledAt.getTime() + (quizData.duration || 60) * 60000);
              status = now > endTime ? 'completed' : 'ongoing';
            }
          }
          
          return {
            id: doc.id,
            ...quizData,
            status,
            attempts: quizData.attempts || 0,
            averageScore: quizData.averageScore || 0,
            duration: quizData.duration || 60
          } as Quiz;
        });
        
        setQuizzes(quizzesData);
        calculateQuizStats(quizzesData);
      },
      (error) => {
        console.error('Quizzes listener error:', error);
        setError('Failed to load quizzes data');
      }
    );
    unsubscribeFunctions.push(unsubscribeQuizzes);

    // Students listener (for enrollment approvals)
    const studentsQuery = query(
      collection(db, 'students'),
      where('enrolledCourses', 'array-contains-any', courses.map(c => c.id))
    );
    
    const unsubscribeStudents = onSnapshot(
      studentsQuery,
      (snapshot) => {
        const studentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          enrolledCourses: doc.data().enrolledCourses || []
        })) as Student[];
        
        setStudents(studentsData);
      },
      (error) => {
        console.error('Students listener error:', error);
        setError('Failed to load students data');
      }
    );
    unsubscribeFunctions.push(unsubscribeStudents);

    // Quiz results listener
    const resultsQuery = query(
      collection(db, 'quizResults'),
      where('facultyId', '==', currentUser.uid),
      orderBy('submittedAt', 'desc')
    );
    
    const unsubscribeResults = onSnapshot(
      resultsQuery,
      (snapshot) => {
        const resultsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          submittedAt: doc.data().submittedAt || null,
          status: doc.data().status || 'pending',
          score: doc.data().score || 0
        })) as QuizResult[];
        
        setQuizResults(resultsData);
        calculateStudentPerformance(resultsData);
      },
      (error) => {
        console.error('Results listener error:', error);
        setError('Failed to load results data');
      }
    );
    unsubscribeFunctions.push(unsubscribeResults);

    setLoading(false);
    
    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  }, [currentUser, userData]);

  const calculateCourseStats = (coursesData: Course[]) => {
    const approved = coursesData.filter(c => c.isApproved).length;
    const pending = coursesData.filter(c => !c.isApproved).length;
    const totalStudents = coursesData.reduce((sum, course) => sum + (course.enrolledStudents || 0), 0);
    const pendingApprovals = coursesData.reduce((sum, course) => sum + (course.pendingApprovals?.length || 0), 0);

    setStats(prev => ({
      ...prev,
      totalCourses: coursesData.length,
      approvedCourses: approved,
      pendingCourses: pending,
      totalStudents,
      pendingApprovals
    }));
  };

  const calculateQuizStats = (quizzesData: Quiz[]) => {
    const active = quizzesData.filter(q => q.status === 'ongoing').length;
    const upcoming = quizzesData.filter(q => q.status === 'scheduled').length;
    const scores = quizzesData.map(q => q.averageScore || 0);
    const averageScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    setStats(prev => ({
      ...prev,
      totalQuizzes: quizzesData.length,
      activeQuizzes: active,
      upcomingQuizzes: upcoming,
      averageScore
    }));
  };

  const calculateStudentPerformance = (results: QuizResult[]) => {
    if (!results.length) return;

    const completedResults = results.filter(r => r.status === 'completed');
    const absentResults = results.filter(r => r.status === 'absent');
    
    // Update analytics based on results
    const analyticsData = {
      completionRate: completedResults.length > 0 
        ? Math.round((completedResults.length / results.length) * 100)
        : 0,
      averageScore: completedResults.length > 0
        ? Math.round(completedResults.reduce((sum, r) => sum + r.score, 0) / completedResults.length)
        : 0,
      absentCount: absentResults.length
    };

    // You can store these analytics in state or send to Firestore
  };

  // Generate extended course code
  const generateExtendedCode = async (baseCode: string) => {
    try {
      // Find all courses with the same base code
      const q = query(
        collection(db, 'courses'),
        where('courseCode', '==', baseCode),
        orderBy('extendedCode', 'desc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      let lastNumber = 0;
      
      if (!querySnapshot.empty) {
        const lastCode = querySnapshot.docs[0].data().extendedCode;
        const match = lastCode.match(/\d+$/);
        if (match) lastNumber = parseInt(match[0]);
      }
      
      // Increment and pad with leading zero
      const nextNumber = (lastNumber + 1).toString().padStart(2, '0');
      return `${baseCode}${nextNumber}`;
    } catch (error) {
      console.error('Error generating extended code:', error);
      return `${baseCode}01`; // fallback
    }
  };

  // Approve/reject student enrollment
  const handleEnrollmentAction = async (courseId: string, studentId: string, action: 'approve' | 'reject') => {
    try {
      const courseRef = doc(db, 'courses', courseId);
      const studentRef = doc(db, 'students', studentId);
      
      await db.runTransaction(async (transaction) => {
        const courseDoc = await transaction.get(courseRef);
        const studentDoc = await transaction.get(studentRef);
        
        if (!courseDoc.exists() || !studentDoc.exists()) {
          throw new Error('Document not found');
        }
        
        const courseData = courseDoc.data() as Course;
        const studentData = studentDoc.data() as Student;
        
        // Remove from pending approvals
        const updatedPending = courseData.pendingApprovals?.filter(id => id !== studentId) || [];
        
        if (action === 'approve') {
          // Add to enrolled students if not already
          if (!studentData.enrolledCourses.includes(courseId)) {
            transaction.update(studentRef, {
              enrolledCourses: [...studentData.enrolledCourses, courseId]
            });
            
            transaction.update(courseRef, {
              enrolledStudents: (courseData.enrolledStudents || 0) + 1,
              pendingApprovals: updatedPending
            });
          }
        } else {
          // Just remove from pending
          transaction.update(courseRef, {
            pendingApprovals: updatedPending
          });
        }
      });
      
      toast.success(`Enrollment ${action}d successfully`);
    } catch (error) {
      console.error(`Error ${action}ing enrollment:`, error);
      toast.error(`Failed to ${action} enrollment`);
    }
  };

  // Schedule a quiz
  const scheduleQuiz = async (quizId: string, date: Date) => {
    try {
      const quizRef = doc(db, 'quizzes', quizId);
      await updateDoc(quizRef, {
        scheduledAt: date,
        status: 'scheduled'
      });
      
      toast.success('Quiz scheduled successfully');
    } catch (error) {
      console.error('Error scheduling quiz:', error);
      toast.error('Failed to schedule quiz');
    }
  };

  // Render loading state
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

  // Render error state
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

  // Render authentication required state
  if (!currentUser || !userData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />
        <div className="ml-64 pt-16 flex items-center justify-center h-screen">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Authentication Required</h3>
            <p className="mt-2 text-gray-600">Please log in to access the faculty dashboard</p>
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
            {/* Courses Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Courses</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">{stats.approvedCourses} approved</span>
                    <span className="text-yellow-600">{stats.pendingCourses} pending</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Students Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">{stats.totalStudents - stats.pendingApprovals} enrolled</span>
                    <span className="text-yellow-600">{stats.pendingApprovals} pending</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quizzes Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Quizzes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalQuizzes}</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-600">{stats.upcomingQuizzes} upcoming</span>
                    <span className="text-green-600">{stats.activeQuizzes} active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100">
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Avg Performance</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
                  <p className="text-xs text-yellow-600">Student average</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Pending Approvals */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Approvals</h3>
                <div className="space-y-3">
                  {courses.filter(c => c.pendingApprovals?.length > 0).length > 0 ? (
                    courses.flatMap(course => 
                      course.pendingApprovals?.map(studentId => {
                        const student = students.find(s => s.id === studentId);
                        if (!student) return null;
                        
                        return (
                          <div key={`${course.id}-${studentId}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{student.name}</p>
                              <p className="text-sm text-gray-500">{course.courseCode} - {course.courseName}</p>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleEnrollmentAction(course.id, studentId, 'approve')}
                                className="p-1 text-green-600 hover:text-green-800"
                                title="Approve"
                              >
                                <UserCheck className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => handleEnrollmentAction(course.id, studentId, 'reject')}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="Reject"
                              >
                                <UserX className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ).filter(Boolean)
                  ) : (
                    <p className="text-gray-500 text-center py-4">No pending approvals</p>
                  )}
                </div>
              </div>
            </div>

            {/* Upcoming Quizzes */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Upcoming Quizzes</h2>
                
                <div className="space-y-4">
                  {quizzes.filter(q => q.status === 'scheduled').length > 0 ? (
                    quizzes
                      .filter(q => q.status === 'scheduled')
                      .slice(0, 3)
                      .map((quiz) => (
                        <div key={quiz.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                              <p className="text-sm text-gray-600">
                                {courses.find(c => c.id === quiz.courseId)?.courseName || 'Unknown Course'}
                              </p>
                            </div>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Scheduled
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 text-gray-500 mr-2" />
                              <span className="text-sm text-gray-600">
                                {quiz.scheduledAt?.toDate().toLocaleString() || 'Not scheduled'}
                              </span>
                            </div>
                            
                            <div className="flex items-center">
                              <Target className="w-4 h-4 text-gray-500 mr-2" />
                              <span className="text-sm text-gray-600">
                                {quiz.duration} minutes
                              </span>
                            </div>
                            
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                              <DateTimePicker
                                label="Reschedule"
                                value={quiz.scheduledAt?.toDate() || new Date()}
                                onChange={(newValue) => {
                                  if (newValue) scheduleQuiz(quiz.id, newValue);
                                }}
                                renderInput={({ inputRef, inputProps, InputProps }) => (
                                  <div className="flex items-center">
                                    <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                                    <input
                                      ref={inputRef}
                                      {...inputProps}
                                      className="text-sm w-36 focus:outline-none"
                                    />
                                    {InputProps?.endAdornment}
                                  </div>
                                )}
                              />
                            </LocalizationProvider>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming quizzes</h3>
                      <p className="mt-1 text-sm text-gray-500">Schedule quizzes to appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Results */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Quiz Results</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quiz</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quizResults.slice(0, 5).map((result) => (
                    <tr key={result.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.studentName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {quizzes.find(q => q.id === result.quizId)?.title || 'Unknown Quiz'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {courses.find(c => c.id === result.courseId)?.courseName || 'Unknown Course'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          result.status === 'completed' ? 'bg-green-100 text-green-800' :
                          result.status === 'absent' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {result.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.status === 'completed' ? `${result.score}%` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.submittedAt ? result.submittedAt.toDate().toLocaleString() : 'Not submitted'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {quizResults.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No quiz results yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Results will appear here after students complete quizzes</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link
                to="/faculty/courses/new"
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left group"
              >
                <Plus className="w-8 h-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-medium text-gray-900">Create Course</h4>
                <p className="text-sm text-gray-500">Add a new course</p>
              </Link>
              
              <Link
                to="/faculty/quizzes/new"
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
                to="/faculty/reports"
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left group"
              >
                <TrendingUp className="w-8 h-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-medium text-gray-900">Analytics</h4>
                <p className="text-sm text-gray-500">View detailed reports</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;