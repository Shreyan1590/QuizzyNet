import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Check, Clock, User, Award } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase'
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
  createdAt: any;
}

const StudentEnrollment: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser && userData) {
      fetchAvailableCourses();
      setEnrolledCourseIds(userData.enrolledCourses || []);
    }
  }, [currentUser, userData]);

  const fetchAvailableCourses = async () => {
    try {
      const coursesQuery = query(
        collection(db, 'courses'),
        where('isApproved', '==', true)
      );
      const coursesSnapshot = await getDocs(coursesQuery);
      const courses = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Course[];

      setAvailableCourses(courses);
    } catch (error) {
      console.error('Error fetching available courses:', error);
      toast.error('Error loading available courses');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollment = async (courseId: string) => {
    if (!currentUser) return;

    setEnrolling(courseId);
    try {
      await updateDoc(doc(db, 'students', currentUser.uid), {
        enrolledCourses: arrayUnion(courseId)
      });

      setEnrolledCourseIds(prev => [...prev, courseId]);
      toast.success('Successfully enrolled in course!');
    } catch (error) {
      console.error('Error enrolling in course:', error);
      toast.error('Error enrolling in course');
    } finally {
      setEnrolling(null);
    }
  };

  const isEnrolled = (courseId: string) => {
    return enrolledCourseIds.includes(courseId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />
        <div className="ml-64 pt-16 flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading available courses...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Course Enrollment</h1>
            <p className="mt-2 text-gray-600">Browse and enroll in approved courses</p>
          </div>

          {availableCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableCourses.map((course) => (
                <div key={course.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{course.courseCode}</h3>
                        <p className="text-sm text-gray-500">{course.subjectCategory}</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Approved
                    </span>
                  </div>

                  <h4 className="text-lg font-medium text-gray-900 mb-2">{course.courseName}</h4>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="w-4 h-4 mr-2" />
                      <span>Faculty: {course.facultyName || 'TBA'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Award className="w-4 h-4 mr-2" />
                      <span>Category: {course.courseCategory}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>
                        Created: {course.createdAt?.toDate ? 
                          new Date(course.createdAt.toDate()).toLocaleDateString() : 
                          'N/A'
                        }
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {isEnrolled(course.id) ? (
                      <button
                        disabled
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Enrolled
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnrollment(course.id)}
                        disabled={enrolling === course.id}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {enrolling === course.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Enrolling...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Enroll
                          </>
                        )}
                      </button>
                    )}
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No courses available</h3>
              <p className="mt-2 text-gray-500">
                There are no approved courses available for enrollment at this time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentEnrollment;