import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Download, Eye, TrendingUp, BookOpen, Award, Calendar, Mail, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  registrationNumber: string;
  dateOfBirth: string;
  enrolledCourses: string[];
  createdAt: any;
  lastActive?: any;
  averageScore?: number;
  completedQuizzes?: number;
}

interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  enrolledStudents: number;
}

const StudentManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [facultyCourses, setFacultyCourses] = useState<Course[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'enrollment' | 'performance'>('name');
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    averagePerformance: 0,
    enrollmentGrowth: 0
  });

  useEffect(() => {
    if (currentUser) {
      initializeRealTimeListeners();
    }
  }, [currentUser]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [students, searchTerm, selectedCourse, sortBy]);

  const initializeRealTimeListeners = () => {
    if (!currentUser) return;

    // Real-time listener for faculty courses
    const coursesQuery = query(
      collection(db, 'courses'),
      where('facultyId', '==', currentUser.uid),
      where('isApproved', '==', true)
    );
    
    const unsubscribeCourses = onSnapshot(coursesQuery, (snapshot) => {
      const courses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        enrolledStudents: Math.floor(Math.random() * 50) + 10 // Simulated
      })) as Course[];
      
      setFacultyCourses(courses);
      fetchEnrolledStudents(courses);
    });

    return () => unsubscribeCourses();
  };

  const fetchEnrolledStudents = async (courses: Course[]) => {
    try {
      const courseIds = courses.map(c => c.id);
      if (courseIds.length === 0) {
        setLoading(false);
        return;
      }

      // Real-time listener for all students
      const studentsQuery = query(collection(db, 'students'));
      const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
        const allStudents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          averageScore: Math.floor(Math.random() * 40) + 60, // Simulated
          completedQuizzes: Math.floor(Math.random() * 10) + 1, // Simulated
          lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Simulated
        })) as Student[];

        // Filter students enrolled in faculty courses
        const enrolledStudents = allStudents.filter(student =>
          student.enrolledCourses?.some(courseId => courseIds.includes(courseId))
        );

        setStudents(enrolledStudents);
        calculateStats(enrolledStudents);
        setLoading(false);
      });

      return () => unsubscribeStudents();
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Error loading student data');
      setLoading(false);
    }
  };

  const calculateStats = (studentList: Student[]) => {
    const total = studentList.length;
    const active = studentList.filter(s => {
      const lastActive = s.lastActive?.toDate ? s.lastActive.toDate() : s.lastActive;
      return lastActive && (new Date().getTime() - lastActive.getTime()) < 7 * 24 * 60 * 60 * 1000;
    }).length;
    
    const avgPerformance = studentList.length > 0 
      ? Math.round(studentList.reduce((sum, s) => sum + (s.averageScore || 0), 0) / studentList.length)
      : 0;

    setStats({
      totalStudents: total,
      activeStudents: active,
      averagePerformance: avgPerformance,
      enrollmentGrowth: Math.floor(Math.random() * 20) + 5 // Simulated
    });
  };

  const applyFiltersAndSort = () => {
    let filtered = [...students];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Course filter
    if (selectedCourse !== 'all') {
      filtered = filtered.filter(student =>
        student.enrolledCourses?.includes(selectedCourse)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'enrollment':
          const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return bDate.getTime() - aDate.getTime();
        case 'performance':
          return (b.averageScore || 0) - (a.averageScore || 0);
        default:
          return 0;
      }
    });

    setFilteredStudents(filtered);
  };

  const exportStudentData = () => {
    const csvContent = [
      ['Name', 'Email', 'Registration Number', 'Phone', 'Enrolled Courses', 'Average Score', 'Completed Quizzes', 'Enrollment Date'],
      ...filteredStudents.map(student => [
        `${student.firstName} ${student.lastName}`,
        student.email,
        student.registrationNumber,
        student.phone || 'N/A',
        student.enrolledCourses?.length || 0,
        student.averageScore || 'N/A',
        student.completedQuizzes || 0,
        student.createdAt?.toDate()?.toLocaleDateString() || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Student data exported successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading student data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Students</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeStudents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Performance</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averagePerformance}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Growth Rate</p>
              <p className="text-2xl font-bold text-gray-900">+{stats.enrollmentGrowth}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Courses</option>
              {facultyCourses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.courseCode} - {course.courseName}
                </option>
              ))}
            </select>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="name">Sort by Name</option>
            <option value="enrollment">Sort by Enrollment Date</option>
            <option value="performance">Sort by Performance</option>
          </select>

          <button
            onClick={exportStudentData}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </button>
        </div>

        <div className="text-sm text-gray-600">
          Showing {filteredStudents.length} of {students.length} students
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Courses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-medium text-sm">
                          {student.firstName?.[0]}{student.lastName?.[0]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {student.firstName} {student.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{student.registrationNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center">
                      <Mail className="w-4 h-4 mr-1 text-gray-400" />
                      {student.email}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center">
                      <Phone className="w-4 h-4 mr-1 text-gray-400" />
                      {student.phone || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.enrolledCourses?.length || 0} courses</div>
                    <div className="text-sm text-gray-500">
                      Enrolled: {student.createdAt?.toDate()?.toLocaleDateString() || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">{student.averageScore}%</div>
                      <div className="ml-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          (student.averageScore || 0) >= 80 ? 'bg-green-100 text-green-800' :
                          (student.averageScore || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {(student.averageScore || 0) >= 80 ? 'Excellent' :
                           (student.averageScore || 0) >= 60 ? 'Good' : 'Needs Improvement'}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">{student.completedQuizzes} quizzes completed</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.lastActive ? (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {student.lastActive.toDate ? 
                          student.lastActive.toDate().toLocaleDateString() :
                          new Date(student.lastActive).toLocaleDateString()
                        }
                      </div>
                    ) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-green-600 hover:text-green-900 inline-flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No students match your current filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentManagement;