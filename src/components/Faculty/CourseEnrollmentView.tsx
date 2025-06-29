import React, { useState, useEffect } from 'react';
import { BookOpen, Users, TrendingUp, Download, Filter, Search, Calendar, Award, BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';

interface EnrollmentData {
  courseId: string;
  courseCode: string;
  courseName: string;
  totalEnrolled: number;
  activeStudents: number;
  completionRate: number;
  averageScore: number;
  enrollmentTrend: number;
  students: Array<{
    id: string;
    name: string;
    email: string;
    registrationNumber: string;
    enrollmentDate: Date;
    progress: number;
    lastActive: Date;
    status: 'active' | 'inactive' | 'completed';
  }>;
}

const CourseEnrollmentView: React.FC = () => {
  const { currentUser } = useAuth();
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData[]>([]);
  const [filteredData, setFilteredData] = useState<EnrollmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'enrollment' | 'completion' | 'performance'>('enrollment');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [showStudentDetails, setShowStudentDetails] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchEnrollmentData();
    }
  }, [currentUser]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [enrollmentData, searchTerm, sortBy]);

  const fetchEnrollmentData = async () => {
    try {
      // Fetch faculty courses
      const coursesQuery = query(
        collection(db, 'courses'),
        where('facultyId', '==', currentUser?.uid),
        where('isApproved', '==', true)
      );
      
      const coursesSnapshot = await getDocs(coursesQuery);
      const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch all students
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const allStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Process enrollment data for each course
      const enrollmentPromises = courses.map(async (course) => {
        const enrolledStudents = allStudents.filter(student =>
          student.enrolledCourses?.includes(course.id)
        );

        const studentsWithDetails = enrolledStudents.map(student => ({
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          registrationNumber: student.registrationNumber,
          enrollmentDate: student.createdAt?.toDate() || new Date(),
          progress: Math.floor(Math.random() * 100), // Simulated
          lastActive: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Simulated
          status: Math.random() > 0.8 ? 'completed' : Math.random() > 0.3 ? 'active' : 'inactive'
        }));

        const activeStudents = studentsWithDetails.filter(s => s.status === 'active').length;
        const completedStudents = studentsWithDetails.filter(s => s.status === 'completed').length;
        const completionRate = enrolledStudents.length > 0 
          ? Math.round((completedStudents / enrolledStudents.length) * 100) 
          : 0;

        return {
          courseId: course.id,
          courseCode: course.courseCode,
          courseName: course.courseName,
          totalEnrolled: enrolledStudents.length,
          activeStudents,
          completionRate,
          averageScore: Math.floor(Math.random() * 40) + 60, // Simulated
          enrollmentTrend: Math.floor(Math.random() * 30) - 10, // Simulated
          students: studentsWithDetails
        };
      });

      const enrollmentResults = await Promise.all(enrollmentPromises);
      setEnrollmentData(enrollmentResults);
    } catch (error) {
      console.error('Error fetching enrollment data:', error);
      toast.error('Error loading enrollment data');
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...enrollmentData];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.courseName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'enrollment':
          return b.totalEnrolled - a.totalEnrolled;
        case 'completion':
          return b.completionRate - a.completionRate;
        case 'performance':
          return b.averageScore - a.averageScore;
        default:
          return 0;
      }
    });

    setFilteredData(filtered);
  };

  const exportEnrollmentData = () => {
    const csvContent = [
      ['Course Code', 'Course Name', 'Total Enrolled', 'Active Students', 'Completion Rate', 'Average Score', 'Enrollment Trend'],
      ...filteredData.map(course => [
        course.courseCode,
        course.courseName,
        course.totalEnrolled,
        course.activeStudents,
        `${course.completionRate}%`,
        `${course.averageScore}%`,
        `${course.enrollmentTrend > 0 ? '+' : ''}${course.enrollmentTrend}%`
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

  const exportStudentDetails = (course: EnrollmentData) => {
    const csvContent = [
      ['Name', 'Email', 'Registration Number', 'Enrollment Date', 'Progress', 'Last Active', 'Status'],
      ...course.students.map(student => [
        student.name,
        student.email,
        student.registrationNumber,
        student.enrollmentDate.toLocaleDateString(),
        `${student.progress}%`,
        student.lastActive.toLocaleDateString(),
        student.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${course.courseCode}_students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(`Student data for ${course.courseCode} exported successfully`);
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

  const totalStats = {
    totalEnrolled: filteredData.reduce((sum, course) => sum + course.totalEnrolled, 0),
    averageCompletion: filteredData.length > 0 
      ? Math.round(filteredData.reduce((sum, course) => sum + course.completionRate, 0) / filteredData.length)
      : 0,
    averagePerformance: filteredData.length > 0
      ? Math.round(filteredData.reduce((sum, course) => sum + course.averageScore, 0) / filteredData.length)
      : 0
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Enrolled</p>
              <p className="text-2xl font-bold text-gray-900">{totalStats.totalEnrolled}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Completion</p>
              <p className="text-2xl font-bold text-gray-900">{totalStats.averageCompletion}%</p>
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
              <p className="text-2xl font-bold text-gray-900">{totalStats.averagePerformance}%</p>
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
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="enrollment">Sort by Enrollment</option>
            <option value="completion">Sort by Completion Rate</option>
            <option value="performance">Sort by Performance</option>
          </select>

          <button
            onClick={exportEnrollmentData}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Overview
          </button>

          <div className="text-sm text-gray-600 flex items-center">
            {filteredData.length} courses
          </div>
        </div>
      </div>

      {/* Course Enrollment Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredData.map((course) => (
          <div key={course.courseId} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{course.courseCode}</h3>
                <p className="text-gray-600">{course.courseName}</p>
              </div>
              <button
                onClick={() => exportStudentDetails(course)}
                className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{course.totalEnrolled}</div>
                <div className="text-sm text-blue-700">Total Enrolled</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{course.activeStudents}</div>
                <div className="text-sm text-green-700">Active Students</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-600">Completion Rate</span>
                  <span className="text-sm font-bold text-green-600">{course.completionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${course.completionRate}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-600">Average Score</span>
                  <span className="text-sm font-bold text-purple-600">{course.averageScore}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${course.averageScore}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-600">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>Enrollment Trend: </span>
                  <span className={`font-medium ml-1 ${
                    course.enrollmentTrend > 0 ? 'text-green-600' : 
                    course.enrollmentTrend < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {course.enrollmentTrend > 0 ? '+' : ''}{course.enrollmentTrend}%
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedCourse(course.courseId);
                    setShowStudentDetails(true);
                  }}
                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  View Students →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No courses found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No courses match your current filters.
          </p>
        </div>
      )}

      {/* Student Details Modal */}
      {showStudentDetails && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Students - {filteredData.find(c => c.courseId === selectedCourse)?.courseCode}
                </h3>
                <button
                  onClick={() => setShowStudentDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredData.find(c => c.courseId === selectedCourse)?.students.map((student) => (
                      <tr key={student.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${student.progress}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">{student.progress}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            student.status === 'active' ? 'bg-green-100 text-green-800' :
                            student.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.lastActive.toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseEnrollmentView;