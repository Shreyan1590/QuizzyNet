import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit, Trash2, Upload, Download, Eye, Clock, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/supabase';
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
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState<string>('');
  
  const [courseForm, setCourseForm] = useState({
    baseCode: '',
    courseName: '',
    subjectCategory: '',
    courseCategory: ''
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
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'English',
    'History',
    'Economics',
    'Psychology',
    'Philosophy'
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

    // Real-time listener for faculty courses
    const coursesQuery = query(
      collection(db, 'courses'),
      where('facultyId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeCourses = onSnapshot(coursesQuery, (snapshot) => {
      const coursesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        enrolledStudents: Math.floor(Math.random() * 50) + 10 // Simulated enrollment
      })) as Course[];

      setCourses(coursesData);
    });

    // Real-time listener for faculty quizzes
    const quizzesQuery = query(
      collection(db, 'quizzes'),
      where('facultyId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeQuizzes = onSnapshot(quizzesQuery, (snapshot) => {
      const quizzesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Quiz[];

      setQuizzes(quizzesData);
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
        courseCategory: ''
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

  const handleFileUpload = async (quizId: string) => {
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    if (csvFile.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      return;
    }

    setUploading(true);
    try {
      // Simulate file processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Questions uploaded successfully!');
      setCsvFile(null);
    } catch (error) {
      console.error('Error uploading questions:', error);
      toast.error('Error uploading questions');
    } finally {
      setUploading(false);
    }
  };

  const handleCourseFormChange = async (field: string, value: string) => {
    setCourseForm(prev => ({ ...prev, [field]: value }));
    
    // Check for duplicates when base code or course name changes
    if (field === 'baseCode' || field === 'courseName') {
      const baseCode = field === 'baseCode' ? value : courseForm.baseCode;
      const courseName = field === 'courseName' ? value : courseForm.courseName;
      
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Course Management</h1>
                <p className="mt-2 text-gray-600">Create and manage your courses and quizzes</p>
              </div>
              <div className="flex space-x-3">
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

          {/* Course Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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

          {/* Courses Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">My Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Category:</span>
                      <span className="font-medium">{course.courseCategory}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Enrolled Students:</span>
                      <span className="font-medium">{course.enrolledStudents}</span>
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
          </div>

          {/* Quizzes Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">My Quizzes</h2>
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          accept=".csv"
                          onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id={`csv-upload-${quiz.id}`}
                        />
                        <label
                          htmlFor={`csv-upload-${quiz.id}`}
                          className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm"
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Upload Questions
                        </label>
                        {csvFile && (
                          <button
                            onClick={() => handleFileUpload(quiz.id)}
                            disabled={uploading}
                            className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                          >
                            {uploading ? 'Uploading...' : 'Save Questions'}
                          </button>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="px-3 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {csvFile && (
                      <div className="mt-2 text-sm text-gray-600">
                        Selected file: {csvFile.name} ({(csvFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Create Course Modal */}
          {showCreateCourse && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Course</h3>
                  
                  <form onSubmit={handleCreateCourse} className="space-y-4">
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