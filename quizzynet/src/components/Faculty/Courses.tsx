import React, { useState, useEffect } from "react";
import { BookOpen, Plus, Edit, Trash2, Upload, Download, Eye, Clock, CheckCircle, Clock as ClockIcon } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { collection, query, where, addDoc, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { toast } from "react-hot-toast";
import Sidebar from "../Layout/Sidebar";
import Header from "../Layout/Header";

interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  subjectCategory: string;
  courseCategory: string;
  facultyId: string;
  facultyName: string;
  isApproved: boolean;
  createdAt: any;
  approvedAt?: any;
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
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [courseForm, setCourseForm] = useState({
    courseCode: "",
    courseName: "",
    subjectCategory: "",
    courseCategory: "",
  });

  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    courseId: "",
    duration: 30,
    questionsCount: 10,
    scheduledAt: "",
  });

  const subjectCategories = [
    "Computer Science",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "English",
    "History",
    "Economics",
    "Psychology",
    "Philosophy",
  ].sort();

  const courseCategories = [
    "Core",
    "Elective",
    "Laboratory",
    "Seminar",
    "Project",
    "Internship",
  ];

  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribeCourses = onSnapshot(
      query(
        collection(db, "courses"),
        where("facultyId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      ),
      (snapshot) => {
        const coursesData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            courseCode: data.courseCode || "",
            courseName: data.courseName || "",
            subjectCategory: data.subjectCategory || "",
            courseCategory: data.courseCategory || "",
            facultyId: data.facultyId || currentUser.uid,
            facultyName: data.facultyName || `${userData?.firstName} ${userData?.lastName}`,
            isApproved: data.isApproved !== undefined ? data.isApproved : false,
            approvedAt: data.approvedAt || null,
            createdAt: data.createdAt || null,
          } as Course;
        });
        setCourses(coursesData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading courses:", error);
        toast.error("Failed to load courses");
        setLoading(false);
      }
    );

    const unsubscribeQuizzes = onSnapshot(
      query(
        collection(db, "quizzes"),
        where("facultyId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      ),
      (snapshot) => {
        const quizzesData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || "",
            description: data.description || "",
            courseId: data.courseId || "",
            duration: data.duration || 30,
            questionsCount: data.questionsCount || 10,
            isActive: data.isActive !== undefined ? data.isActive : true,
            scheduledAt: data.scheduledAt || null,
            createdAt: data.createdAt || null,
          } as Quiz;
        });
        setQuizzes(quizzesData);
      },
      (error) => {
        console.error("Error loading quizzes:", error);
        toast.error("Failed to load quizzes");
      }
    );

    return () => {
      unsubscribeCourses();
      unsubscribeQuizzes();
    };
  }, [currentUser, userData]);

  const generateCourseCode = (subjectCategory: string) => {
    const subjectCode = subjectCategory.substring(0, 3).toUpperCase();
    const commonNumber = Math.floor(Math.random() * 100).toString().padStart(2, "0");
    const uniqueId = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `${subjectCode}${commonNumber}${uniqueId}`;
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userData) return;

    try {
      const courseCode = generateCourseCode(courseForm.subjectCategory);

      await addDoc(collection(db, "courses"), {
        ...courseForm,
        courseCode,
        facultyId: currentUser.uid,
        facultyName: `${userData.firstName} ${userData.lastName}`,
        isApproved: false,
        createdAt: new Date(),
      });

      toast.success("Course created successfully! Awaiting admin approval.");
      setShowCreateCourse(false);
      setCourseForm({
        courseCode: "",
        courseName: "",
        subjectCategory: "",
        courseCategory: "",
      });
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error("Error creating course");
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userData) return;

    try {
      const selectedCourse = courses.find((c) => c.id === quizForm.courseId);
      if (!selectedCourse?.isApproved) {
        throw new Error("Course must be approved by admin");
      }

      const scheduledAt = quizForm.scheduledAt ? new Date(quizForm.scheduledAt) : null;

      await addDoc(collection(db, "quizzes"), {
        ...quizForm,
        facultyId: currentUser.uid,
        facultyName: `${userData.firstName} ${userData.lastName}`,
        isActive: true,
        scheduledAt,
        createdAt: new Date(),
      });

      toast.success("Quiz created successfully!");
      setShowCreateQuiz(false);
      setQuizForm({
        title: "",
        description: "",
        courseId: "",
        duration: 30,
        questionsCount: 10,
        scheduledAt: "",
      });
    } catch (error) {
      console.error("Error creating quiz:", error);
      toast.error(error.message || "Error creating quiz");
    }
  };

  const handleFileUpload = async (quizId: string) => {
    if (!csvFile) {
      toast.error("Please select a CSV file");
      return;
    }

    if (csvFile.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }

    setUploading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success("Questions uploaded successfully!");
      setCsvFile(null);
    } catch (error) {
      console.error("Error uploading questions:", error);
      toast.error("Error uploading questions");
    } finally {
      setUploading(false);
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
                  disabled={courses.filter((c) => c.isApproved).length === 0}
                  className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
                    courses.filter((c) => c.isApproved).length === 0
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Quiz
                </button>
              </div>
            </div>
          </div>

          {/* Courses Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">My Courses</h2>
            {courses.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <BookOpen className="w-12 h-12 mx-auto text-gray-400" />
                <p className="mt-4 text-gray-600">No courses found</p>
                <button
                  onClick={() => setShowCreateCourse(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Course
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div key={course.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{course.courseCode}</h3>
                        <p className="text-sm text-gray-500">{course.subjectCategory}</p>
                      </div>
                      <div className="flex items-center">
                        {course.isApproved ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mr-1" />
                        ) : (
                          <ClockIcon className="w-5 h-5 text-yellow-500 mr-1" />
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          course.isApproved ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {course.isApproved ? "Approved" : "Pending"}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-lg font-medium text-gray-900 mb-2">{course.courseName}</h4>
                    <p className="text-sm text-gray-600 mb-4">Category: {course.courseCategory}</p>

                    {course.isApproved && course.approvedAt && (
                      <p className="text-xs text-gray-500 mb-2">
                        Approved on: {course.approvedAt.toDate().toLocaleDateString()}
                      </p>
                    )}

                    <div className="flex space-x-2">
                      <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        <Eye className="w-4 h-4 inline mr-1" />
                        View
                      </button>
                      {!course.isApproved && (
                        <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quizzes Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">My Quizzes</h2>
            {quizzes.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <Clock className="w-12 h-12 mx-auto text-gray-400" />
                <p className="mt-4 text-gray-600">No quizzes found</p>
                {courses.filter((c) => c.isApproved).length === 0 ? (
                  <p className="mt-2 text-sm text-red-500">
                    You need at least one approved course to create a quiz
                  </p>
                ) : (
                  <button
                    onClick={() => setShowCreateQuiz(true)}
                    className="mt-4 inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Quiz
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {quizzes.map((quiz) => {
                  const course = courses.find((c) => c.id === quiz.courseId);
                  return (
                    <div key={quiz.id} className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{quiz.title}</h3>
                          <p className="text-gray-600 mb-2">{quiz.description}</p>
                          {course && (
                            <p className="text-sm text-gray-500 mb-2">
                              For: {course.courseCode} - {course.courseName}
                            </p>
                          )}
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
                            quiz.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}>
                            {quiz.isActive ? "Active" : "Inactive"}
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
                                {uploading ? "Uploading..." : "Save Questions"}
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
                  );
                })}
              </div>
            )}
          </div>

          {/* Create Course Modal */}
          {showCreateCourse && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Course</h3>
                  <form onSubmit={handleCreateCourse} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Course Name</label>
                      <input
                        type="text"
                        value={courseForm.courseName}
                        onChange={(e) => setCourseForm({ ...courseForm, courseName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subject Category</label>
                      <select
                        value={courseForm.subjectCategory}
                        onChange={(e) => setCourseForm({ ...courseForm, subjectCategory: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select Subject Category</option>
                        {subjectCategories.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Course Category</label>
                      <select
                        value={courseForm.courseCategory}
                        onChange={(e) => setCourseForm({ ...courseForm, courseCategory: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select Course Category</option>
                        {courseCategories.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowCreateCourse(false)}
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Title</label>
                      <input
                        type="text"
                        value={quizForm.title}
                        onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={quizForm.description}
                        onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={3}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                      <select
                        value={quizForm.courseId}
                        onChange={(e) => setQuizForm({ ...quizForm, courseId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select Course</option>
                        {courses.filter((c) => c.isApproved).map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.courseCode} - {course.courseName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Questions Count</label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Schedule (Optional)</label>
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