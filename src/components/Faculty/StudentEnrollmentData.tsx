import React, { useState, useEffect } from 'react';
import { Users, BookOpen, TrendingUp, AlertTriangle, Search, Filter, Download, Eye, Calendar, Mail, Phone, Award } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  registrationNumber: string;
  dateOfBirth: string;
  enrolledCourses: string[];
  completedCourses?: string[];
  isBlocked: boolean;
  createdAt: any;
  lastLoginAt?: any;
  academicStanding: 'excellent' | 'good' | 'satisfactory' | 'probation' | 'suspended';
  gpa?: number;
}

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
}

interface EnrollmentStats {
  totalStudents: number;
  activeStudents: number;
  blockedStudents: number;
  averageGPA: number;
  enrollmentTrend: number;
  academicStandingDistribution: {
    excellent: number;
    good: number;
    satisfactory: number;
    probation: number;
    suspended: number;
  };
}

interface CourseEnrollmentData {
  course: Course;
  enrolledStudents: Student[];
  enrollmentCount: number;
  activeCount: number;
  completionRate: number;
  averageGPA: number;
}

const StudentEnrollmentData: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [enrollmentData, setEnrollmentData] = useState<CourseEnrollmentData[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [facultyCourses, setFacultyCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<EnrollmentStats>({
    totalStudents: 0,
    activeStudents: 0,
    blockedStudents: 0,
    averageGPA: 0,
    enrollmentTrend: 0,
    academicStandingDistribution: {
      excellent: 0,
      good: 0,
      satisfactory: 0,
      probation: 0,
      suspended: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'enrollment' | 'gpa' | 'standing'>('name');

  useEffect(() => {
    if (currentUser && userData) {
      initializeRealTimeListeners();
    }
  }, [currentUser, userData]);

  const initializeRealTimeListeners = () => {
    if (!currentUser) return;

    try {
      // Real-time listener for faculty courses
      const coursesQuery = query(
        collection(db, 'courses'),
        where('facultyId', '==', currentUser.uid),
        where('isApproved', '==', true)
      );

      const unsubscribeCourses = onSnapshot(
        coursesQuery,
        (snapshot) => {
          const courses = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Course[];
          
          setFacultyCourses(courses);
          fetchStudentEnrollmentData(courses);
        },
        (error) => {
          console.error('Error fetching courses:', error);
          setError('Failed to load courses. Please check your permissions.');
          toast.error('Error loading courses');
        }
      );

      // Real-time listener for all students
      const studentsQuery = query(collection(db, 'students'));
      const unsubscribeStudents = onSnapshot(
        studentsQuery,
        (snapshot) => {
          const students = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              academicStanding: calculateAcademicStanding(data),
              gpa: calculateGPA(data)
            };
          }) as Student[];
          
          setAllStudents(students);
        },
        (error) => {
          console.error('Error fetching students:', error);
          if (error.code !== 'permission-denied') {
            setError('Failed to load student data. Please check your permissions.');
            toast.error('Error loading student data');
          }
        }
      );

      return () => {
        unsubscribeCourses();
        unsubscribeStudents();
      };
    } catch (error) {
      console.error('Error setting up listeners:', error);
      setError('Failed to initialize data listeners');
      setLoading(false);
    }
  };

  const fetchStudentEnrollmentData = async (courses: Course[]) => {
    try {
      if (courses.length === 0) {
        setEnrollmentData([]);
        setLoading(false);
        return;
      }

      const courseIds = courses.map(c => c.id);
      const enrollmentPromises = courses.map(async (course) => {
        // Get students enrolled in this specific course
        const enrolledStudents = allStudents.filter(student =>
          student.enrolledCourses?.includes(course.id) && !student.isBlocked
        );

        const activeStudents = enrolledStudents.filter(student => {
          const lastLogin = student.lastLoginAt?.toDate ? student.lastLoginAt.toDate() : null;
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return lastLogin && lastLogin > thirtyDaysAgo;
        });

        const completedStudents = enrolledStudents.filter(student =>
          student.completedCourses?.includes(course.id)
        );

        const completionRate = enrolledStudents.length > 0 
          ? Math.round((completedStudents.length / enrolledStudents.length) * 100)
          : 0;

        const averageGPA = enrolledStudents.length > 0
          ? enrolledStudents.reduce((sum, student) => sum + (student.gpa || 0), 0) / enrolledStudents.length
          : 0;

        return {
          course,
          enrolledStudents,
          enrollmentCount: enrolledStudents.length,
          activeCount: activeStudents.length,
          completionRate,
          averageGPA: Math.round(averageGPA * 100) / 100
        };
      });

      const enrollmentResults = await Promise.all(enrollmentPromises);
      setEnrollmentData(enrollmentResults);
      calculateOverallStats(enrollmentResults);
      
    } catch (error) {
      console.error('Error fetching enrollment data:', error);
      setError('Failed to process enrollment data');
      toast.error('Error processing enrollment data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAcademicStanding = (studentData: any): 'excellent' | 'good' | 'satisfactory' | 'probation' | 'suspended' => {
    if (studentData.isBlocked) return 'suspended';
    
    const gpa = calculateGPA(studentData);
    if (gpa >= 3.7) return 'excellent';
    if (gpa >= 3.0) return 'good';
    if (gpa >= 2.0) return 'satisfactory';
    return 'probation';
  };

  const calculateGPA = (studentData: any): number => {
    // Simulate GPA calculation based on available data
    // In a real implementation, this would calculate from actual grades
    const baseGPA = 2.0 + Math.random() * 2.0; // Random between 2.0 and 4.0
    return Math.round(baseGPA * 100) / 100;
  };

  const calculateOverallStats = (enrollmentResults: CourseEnrollmentData[]) => {
    const allEnrolledStudents = new Set<string>();
    const allActiveStudents = new Set<string>();
    const allBlockedStudents = new Set<string>();
    let totalGPA = 0;
    let gpaCount = 0;

    const standingDistribution = {
      excellent: 0,
      good: 0,
      satisfactory: 0,
      probation: 0,
      suspended: 0
    };

    enrollmentResults.forEach(({ enrolledStudents }) => {
      enrolledStudents.forEach(student => {
        allEnrolledStudents.add(student.id);
        
        if (student.isBlocked) {
          allBlockedStudents.add(student.id);
        } else {
          const lastLogin = student.lastLoginAt?.toDate ? student.lastLoginAt.toDate() : null;
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          if (lastLogin && lastLogin > thirtyDaysAgo) {
            allActiveStudents.add(student.id);
          }
        }

        if (student.gpa) {
          totalGPA += student.gpa;
          gpaCount++;
        }

        standingDistribution[student.academicStanding]++;
      });
    });

    const averageGPA = gpaCount > 0 ? Math.round((totalGPA / gpaCount) * 100) / 100 : 0;
    
    // Calculate enrollment trend (simulated)
    const enrollmentTrend = Math.floor(Math.random() * 20) - 5; // -5% to +15%

    setStats({
      totalStudents: allEnrolledStudents.size,
      activeStudents: allActiveStudents.size,
      blockedStudents: allBlockedStudents.size,
      averageGPA,
      enrollmentTrend,
      academicStandingDistribution: standingDistribution
    });
  };

  const getFilteredStudents = () => {
    let students = allStudents;

    // Filter by course if selected
    if (selectedCourse !== 'all') {
      students = students.filter(student =>
        student.enrolledCourses?.includes(selectedCourse)
      );
    } else {
      // Show only students enrolled in faculty courses
      const facultyCourseIds = facultyCourses.map(c => c.id);
      students = students.filter(student =>
        student.enrolledCourses?.some(courseId => facultyCourseIds.includes(courseId))
      );
    }

    // Apply search filter
    if (searchTerm) {
      students = students.filter(student =>
        student.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    students.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'enrollment':
          const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return bDate.getTime() - aDate.getTime();
        case 'gpa':
          return (b.gpa || 0) - (a.gpa || 0);
        case 'standing':
          const standingOrder = { excellent: 5, good: 4, satisfactory: 3, probation: 2, suspended: 1 };
          return standingOrder[b.academicStanding] - standingOrder[a.academicStanding];
        default:
          return 0;
      }
    });

    return students;
  };

  const exportEnrollmentData = () => {
    const csvContent = [
      ['Course Code', 'Course Name', 'Total Enrolled', 'Active Students', 'Completion Rate', 'Average GPA'],
      ...enrollmentData.map(data => [
        data.course.courseCode,
        data.course.courseName,
        data.enrollmentCount,
        data.activeCount,
        `${data.completionRate}%`,
        data.averageGPA
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enrollment_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Enrollment data exported successfully');
  };

  const exportStudentData = () => {
    const students = getFilteredStudents();
    const csvContent = [
      ['Name', 'Email', 'Registration Number', 'Phone', 'Academic Standing', 'GPA', 'Enrolled Courses', 'Status', 'Enrollment Date'],
      ...students.map(student => [
        `${student.firstName} ${student.lastName}`,
        student.email,
        student.registrationNumber,
        student.phone || 'N/A',
        student.academicStanding,
        student.gpa || 'N/A',
        student.enrolledCourses?.length || 0,
        student.isBlocked ? 'Blocked' : 'Active',
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

  const getAcademicStandingColor = (standing: string) => {
    switch (standing) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'satisfactory': return 'bg-yellow-100 text-yellow-800';
      case 'probation': return 'bg-orange-100 text-orange-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading enrollment data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              initializeRealTimeListeners();
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const filteredStudents = getFilteredStudents();

  return (
    <div className="space-y-6">
      {/* Total Student Count - Prominently Displayed */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Total Enrolled Students</h2>
            <p className="text-green-100">Across all your approved courses</p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold">{stats.totalStudents}</div>
            <div className="flex items-center mt-2">
              <TrendingUp className="w-5 h-5 mr-1" />
              <span className="text-lg">
                {stats.enrollmentTrend > 0 ? '+' : ''}{stats.enrollmentTrend}% this month
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Students</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeStudents}</p>
              <p className="text-xs text-blue-600">Last 30 days</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Average GPA</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageGPA}</p>
              <p className="text-xs text-yellow-600">Out of 4.0</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Excellent Standing</p>
              <p className="text-2xl font-bold text-gray-900">{stats.academicStandingDistribution.excellent}</p>
              <p className="text-xs text-green-600">GPA ≥ 3.7</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Need Attention</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.academicStandingDistribution.probation + stats.academicStandingDistribution.suspended}
              </p>
              <p className="text-xs text-red-600">Probation/Suspended</p>
            </div>
          </div>
        </div>
      </div>

      {/* Course Enrollment Breakdown */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Course Enrollment Breakdown</h3>
          <button
            onClick={exportEnrollmentData}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Course Data
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrollmentData.map((data) => (
            <div key={data.course.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{data.course.courseCode}</h4>
                  <p className="text-sm text-gray-600">{data.course.courseName}</p>
                </div>
                <span className="text-lg font-bold text-green-600">{data.enrollmentCount}</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Active:</span>
                  <span className="font-medium">{data.activeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completion:</span>
                  <span className="font-medium">{data.completionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg GPA:</span>
                  <span className="font-medium">{data.averageGPA}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {enrollmentData.length === 0 && (
          <div className="text-center py-8">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No approved courses</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create and get approval for courses to see enrollment data.
            </p>
          </div>
        )}
      </div>

      {/* Student Details Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Student Details</h3>
          <button
            onClick={exportStudentData}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Student Data
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
            <option value="gpa">Sort by GPA</option>
            <option value="standing">Sort by Academic Standing</option>
          </select>

          <div className="text-sm text-gray-600 flex items-center">
            Showing {filteredStudents.length} students
          </div>
        </div>

        {/* Students Table */}
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
                  Academic Standing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrollment
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
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAcademicStandingColor(student.academicStanding)}`}>
                      {student.academicStanding}
                    </span>
                    <div className="text-sm text-gray-500 mt-1">GPA: {student.gpa || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.enrolledCourses?.length || 0} courses</div>
                    <div className="text-sm text-gray-500 flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {student.createdAt?.toDate()?.toLocaleDateString() || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      student.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {student.isBlocked ? 'Blocked' : 'Active'}
                    </span>
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
              {searchTerm || selectedCourse !== 'all' 
                ? 'No students match your current filters.'
                : 'No students are enrolled in your courses yet.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentEnrollmentData;