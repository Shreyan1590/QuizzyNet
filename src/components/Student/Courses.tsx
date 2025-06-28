import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, User, Calendar, Award } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
  createdAt: any;
}

const StudentCourses: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser && userData) {
      fetchEnrolledCourses();
    }
  }, [currentUser, userData]);

  const fetchEnrolledCourses = async () => {
    if (!userData?.enrolledCourses || userData.enrolledCourses.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const coursesData: Course[] = [];
      
      for (const courseId of userData.enrolledCourses) {
        const courseQuery = query(
          collection(db, 'courses'),
          where('__name__', '==', courseId)
        );
        const courseSnapshot = await getDocs(courseQuery);
        
        courseSnapshot.forEach(doc => {
          coursesData.push({ id: doc.id, ...doc.data() } as Course);
        });
      }

      setEnrolledCourses(coursesData);
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      toast.error('Error loading courses');
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
            <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
            <p className="mt-2 text-gray-600">Courses you are currently enrolled in</p>
          </div>

          {enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((course) => (
                <div key={course.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{course.courseCode}</h3>
                        <p className="text-sm text-gray-500">{course.subjectCategory}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      course.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {course.isApproved ? 'Active' : 'Pending'}
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
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>
                        Enrolled: {course.createdAt?.toDate ? 
                          new Date(course.createdAt.toDate()).toLocaleDateString() : 
                          'N/A'
                        }
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      View Details
                    </button>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      Resources
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No courses enrolled</h3>
              <p className="mt-2 text-gray-500">
                You haven't enrolled in any courses yet. Visit the enrollment page to browse available courses.
              </p>
              <div className="mt-6">
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                  Browse Courses
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentCourses;