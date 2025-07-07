import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit, Trash2, Upload, Download, Eye, Clock, Users, CheckCircle, AlertTriangle, FileText, BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';
import BulkQuestionUpload from './BulkQuestionUpload';
import CourseEnrollmentView from './CourseEnrollmentView';
import StudentManagement from './StudentManagement';
import StudentEnrollmentData from './StudentEnrollmentData';

interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  subjectCategory: string;
  courseCategory: string;
  description?: string;
  credits?: number;
  prerequisites?: string;
  facultyId: string;
  facultyName: string;
  isApproved: boolean;
  enrolledStudents: number;
  createdAt: any;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  courseId: string;
  duration: number;
  questionsCount: number;
  isActive: boolean;
  scheduledAt: any;
  createdAt: any;
}

const FacultyCourses: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'courses' | 'enrollment' | 'students' | 'quizzes'>('courses');
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [showBulkQuestionUpload, setShowBulkQuestionUpload] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [duplicateCheck, setDuplicateCheck] = useState<string>('');
  
  const [courseForm, setCourseForm] = useState({
    baseCode: '',
    courseName: '',
    subjectCategory: '',
    courseCategory: '',
    description: '',
    credits: 3,
    prerequisites: ''
  });

  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    courseId: '',
    duration: 30,
    questionsCount: 10,
    scheduledAt: ''
  });

  const subjectCategories = [
    'Computer Science',
    'Information Technology',
    'Software Engineering',
    'Data Science',
    'Cybersecurity',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'English Literature',
    'History',
    'Economics',
    'Business Administration',
    'Psychology',
    'Philosophy',
    'Engineering',
    'Medicine',
    'Law'
  ].sort();

  const courseCategories = [
    'Core',
    'Elective',
    'Laboratory',
    'Seminar',
    'Project',
    'Internship'
  ];

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
      const coursesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Course[];

      // Fetch accurate enrollment data for each course
      const coursesWithEnrollment = await Promise.all(
        coursesData.map(async (course) => {
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

      setCourses(sortedCourses);
    });

    // Real-time listener for faculty quizzes - only filter by facultyId
    const quizzesQuery = query(
      collection(db, 'quizzes'),
      where('facultyId', '==', currentUser.uid)
    );
    const unsubscribeQuizzes = onSnapshot(quizzesQuery, (snapshot) => {
      const quizzesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Quiz[];

      // Sort by createdAt in memory after fetching
      const sortedQuizzes = quizzesData.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        const aTime = a.createdAt.toDate ? a.createdAt.toDate().getTime() : a.createdAt.getTime();
        const bTime = b.createdAt.toDate ? b.createdAt.toDate().getTime() : b.createdAt.getTime();
        return bTime - aTime; // Descending order
      });

      setQuizzes(sortedQuizzes);
    });

    setLoading(false);

    // Cleanup function
    return () => {
      unsubscribeCourses();
      unsubscribeQuizzes();
    };
  };

  const generateExtendedCourseCode = async (baseCode: string, courseName: string) => {
    try {
      // Check for existing courses with similar base codes
      const existingCoursesQuery = query(
        collection(db, 'courses'),
        where('facultyId', '==', currentUser?.uid)
      );
      const existingSnapshot = await getDocs(existingCoursesQuery);
      const existingCourses = existingSnapshot.docs.map(doc => doc.data());
      
      // Find courses with the same base code
      const sameBases = existingCourses.filter(course => 
        course.courseCode?.startsWith(baseCode)
      );
      
      // Generate sequential number
      const sequential = sameBases.length + 1;
      const paddedSequential = sequential.toString().padStart(2, '0');
      
      // Format: [BaseCode][Sequential]-[Name]
      const extendedCode = `${baseCode}${paddedSequential}-${courseName.replace(/\s+/g, '')}`;
      
      return extendedCode;
    } catch (error) {
      console.error('Error generating course code:', error);
      return `${baseCode}01-${courseName.replace(/\s+/g, '')}`;
    }
  };

  const checkForDuplicates = async (baseCode: string, courseName: string) => {
    try {
      const coursesQuery = query(collection(db, 'courses'));
      const snapshot = await getDocs(coursesQuery);
      const allCourses = snapshot.docs.map(doc => doc.data());
      
      const duplicates = allCourses.filter(course => 
        course.courseCode?.includes(baseCode) || 
        course.courseName?.toLowerCase() === courseName.toLowerCase()
      );
      
      if (duplicates.length > 0) {
        setDuplicateCheck(`Warning: Found ${duplicates.length} similar course(s)`);
        return true;
      }
      
      setDuplicateCheck('');
      return false;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return false;
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userData) return;

    try {
      // Check for duplicates
      await checkForDuplicates(courseForm.baseCode, courseForm.courseName);
      
      // Generate extended course code
      const extendedCode = await generateExtendedCourseCode(courseForm.baseCode, courseForm.courseName);
      
      await addDoc(collection(db, 'courses'), {
        courseCode: extendedCode,
        courseName: courseForm.courseName,
        subjectCategory: courseForm.subjectCategory,
        courseCategory: courseForm.courseCategory,
        description: courseForm.description,
        credits: courseForm.credits,
        prerequisites: courseForm.prerequisites,
        facultyId: currentUser.uid,
        facultyName: `${userData.firstName} ${userData.lastName}`,
        isApproved: false, // Requires admin approval
        createdAt: new Date(),
        enrolledStudents: 0
      });

      toast.success('Course created successfully! Awaiting admin approval.');
      setShowCreateCourse(false);
      setCourseForm({
        baseCode: '',
        courseName: '',
        subjectCategory: '',
        courseCategory: '',
        description: '',
        credits: 3,
        prerequisites: ''
      });
      setDuplicateCheck('');
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error('Error creating course');
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userData) return;

    try {
      const scheduledAt = quizForm.scheduledAt ? new Date(quizForm.scheduledAt) : null;
      const selectedCourseData = courses.find(c => c.id === quizForm.courseId);
      
      await addDoc(collection(db, 'quizzes'), {
        ...quizForm,
        courseCode: selectedCourseData?.courseCode || '',
        courseName: selectedCourseData?.courseName || '',
        facultyId: currentUser.uid,
        facultyName: `${userData.firstName} ${userData.lastName}`,
        isActive: true,
        scheduledAt,
        createdAt: new Date()
      });

      toast.success('Quiz created successfully!');
      setShowCreateQuiz(false);
      setQuizForm({
        title: '',
        description: '',
        courseId: '',
        duration: 30,
        questionsCount: 10,
        scheduledAt: ''
      });
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error('Error creating quiz');
    }
  };

  const handleCourseFormChange = async (field: string, value: string | number) => {
    setCourseForm(prev => ({ ...prev, [field]: value }));
    
    // Check for duplicates when base code or course name changes
    if (field === 'baseCode' || field === 'courseName') {
      const baseCode = field === 'baseCode' ? value as string : courseForm.baseCode;
      const courseName = field === 'courseName' ? value as string : courseForm.courseName;
      
      if (baseCode && courseName) {
        await checkForDuplicates(baseCode, courseName);
      }
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
            <p className="mt-4 text-gray-600">Loading courses...</p>
          </div>
        </div>
      </div>
    );
  }

  // Prepare quiz data for bulk upload component
  const quizData = quizzes.map(quiz => {
    const course = courses.find(c => c.id === quiz.courseId);
    return {
      id: quiz.id,
      title: quiz.title,
      courseCode: course?.courseCode || '',
      courseName: course?.courseName || ''
    };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      
      <div className="ml-64 pt-16">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Course Management</h1>
                <p className="mt-2 text-gray-600">Create and manage your courses and quizzes</p>
              </div>
              <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowBulkQuestionUpload(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Question Upload
                </button>
                <button
                  onClick={() => setShowCreateCourse(true)}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Course
                </button>
                <button
                  onClick={() => setShowCreateQuiz(true)}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Quiz
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                {[
                  { id: 'courses', name: 'My Courses', icon: BookOpen },
                  { id: 'enrollment', name: 'Student Enrollment', icon: BarChart3 },
                  { id: 'students', name: 'Student Management', icon: Users },
                  { id: 'quizzes', name: 'My Quizzes', icon: FileText }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                      activeTab === tab.id
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4 mr-2" />
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'courses' && (
            <div>
              {/* Course Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100">
                      <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Courses</p>
                      <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-100">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Approved</p>
                      <p className="text-2xl font-bold text-gray-900">{courses.filter(c => c.isApproved).length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-yellow-100">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Pending</p>
                      <p className="text-2xl font-bold text-gray-900">{courses.filter(c => !c.isApproved).length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-100">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Students</p>
                      <p className="text-2xl font-bold text-gray-900">{courses.reduce((sum, c) => sum + c.enrolledStudents, 0)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Courses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {courses.map((course) => (
                  <div key={course.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{course.courseCode}</h3>
                        <p className="text-sm text-gray-500">{course.subjectCategory}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          course.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {course.isApproved ? 'Approved' : 'Pending'}
                        </span>
                        {!course.isApproved && (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                    </div>
                    
                    <h4 className="text-lg font-medium text-gray-900 mb-2">{course.courseName}</h4>
                    
                    {course.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{course.description}</p>
                    )}
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Category:</span>
                        <span className="font-medium">{course.courseCategory}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Credits:</span>
                        <span className="font-medium">{course.credits || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Enrolled Students:</span>
                        <span className="font-medium text-green-600">{course.enrolledStudents}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">
                          {course.createdAt?.toDate ? 
                            new Date(course.createdAt.toDate()).toLocaleDateString() : 
                            'N/A'
                          }
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        <Eye className="w-4 h-4 inline mr-1" />
                        View
                      </button>
                      <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {courses.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="mx-auto h-16 w-16 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No courses created</h3>
                  <p className="mt-2 text-gray-500">
                    Create your first course to get started with teaching.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowCreateCourse(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Course
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'enrollment' && <StudentEnrollmentData />}
          {activeTab === 'students' && <StudentManagement />}

          {activeTab === 'quizzes' && (
            <div className="space-y-4">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{quiz.title}</h3>
                      <p className="text-gray-600 mb-2">{quiz.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {quiz.duration} min
                        </span>
                        <span className="flex items-center">
                          <BookOpen className="w-4 h-4 mr-1" />
                          {quiz.questionsCount} questions
                        </span>
                        {quiz.scheduledAt && (
                          <span>
                            Scheduled: {quiz.scheduledAt.toDate().toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        quiz.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {quiz.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-end space-x-2">
                      <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="px-3 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {quizzes.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-16 w-16 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No quizzes created</h3>
                  <p className="mt-2 text-gray-500">
                    Create your first quiz to start assessing students.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowCreateQuiz(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Quiz
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bulk Question Upload Modal */}
          {showBulkQuestionUpload && (
            <BulkQuestionUpload 
              onClose={() => setShowBulkQuestionUpload(false)} 
              quizzes={quizData}
            />
          )}

          {/* Create Course Modal */}
          {showCreateCourse && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Course</h3>
                  
                  <form onSubmit={handleCreateCourse} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Base Code (e.g., CSA12)
                        </label>
                        <input
                          type="text"
                          value={courseForm.baseCode}
                          onChange={(e) => handleCourseFormChange('baseCode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Enter base code"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Credits
                        </label>
                        <select
                          value={courseForm.credits}
                          onChange={(e) => handleCourseFormChange('credits', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          {[1, 2, 3, 4, 5, 6].map(credit => (
                            <option key={credit} value={credit}>{credit}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course Name
                      </label>
                      <input
                        type="text"
                        value={courseForm.courseName}
                        onChange={(e) => handleCourseFormChange('courseName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Enter course name"
                        required
                      />
                    </div>

                    {duplicateCheck && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">{duplicateCheck}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subject Category
                        </label>
                        <select
                          value={courseForm.subjectCategory}
                          onChange={(e) => handleCourseFormChange('subjectCategory', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          required
                        >
                          <option value="">Select Subject Category</option>
                          {subjectCategories.map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Course Category
                        </label>
                        <select
                          value={courseForm.courseCategory}
                          onChange={(e) => handleCourseFormChange('courseCategory', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          required
                        >
                          <option value="">Select Course Category</option>
                          {courseCategories.map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={courseForm.description}
                        onChange={(e) => handleCourseFormChange('description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        rows={3}
                        placeholder="Course description"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prerequisites
                      </label>
                      <input
                        type="text"
                        value={courseForm.prerequisites}
                        onChange={(e) => handleCourseFormChange('prerequisites', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Enter prerequisites (e.g., CSA101, MAT201) or 'None'"
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateCourse(false);
                          setDuplicateCheck('');
                        }}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Create Course
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Create Quiz Modal */}
          {showCreateQuiz && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Quiz</h3>
                  
                  <form onSubmit={handleCreateQuiz} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quiz Title
                      </label>
                      <input
                        type="text"
                        value={quizForm.title}
                        onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={quizForm.description}
                        onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={3}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course
                      </label>
                      <select
                        value={quizForm.courseId}
                        onChange={(e) => setQuizForm({ ...quizForm, courseId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select Course</option>
                        {courses.filter(c => c.isApproved).map(course => (
                          <option key={course.id} value={course.id}>
                            {course.courseCode} - {course.courseName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration (minutes)
                        </label>
                        <input
                          type="number"
                          value={quizForm.duration}
                          onChange={(e) => setQuizForm({ ...quizForm, duration: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          min="1"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Questions Count
                        </label>
                        <input
                          type="number"
                          value={quizForm.questionsCount}
                          onChange={(e) => setQuizForm({ ...quizForm, questionsCount: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Schedule (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={quizForm.scheduledAt}
                        onChange={(e) => setQuizForm({ ...quizForm, scheduledAt: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowCreateQuiz(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Create Quiz
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyCourses;