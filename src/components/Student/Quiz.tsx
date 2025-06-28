import React, { useState, useEffect } from 'react';
import { PlayCircle, Clock, FileQuestion, Award, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';

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
  createdAt: any;
}

const StudentQuiz: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser && userData) {
      fetchAvailableQuizzes();
    }
  }, [currentUser, userData]);

  const fetchAvailableQuizzes = async () => {
    if (!userData?.enrolledCourses || userData.enrolledCourses.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const quizzesQuery = query(
        collection(db, 'quizzes'),
        where('isActive', '==', true)
      );
      const quizzesSnapshot = await getDocs(quizzesQuery);
      const quizzes = quizzesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Quiz))
        .filter(quiz => userData.enrolledCourses?.includes(quiz.courseId));

      setAvailableQuizzes(quizzes);
    } catch (error) {
      console.error('Error fetching available quizzes:', error);
      toast.error('Error loading quizzes');
    } finally {
      setLoading(false);
    }
  };

  const isQuizAvailable = (quiz: Quiz) => {
    if (!quiz.scheduledAt) return true;
    const now = new Date();
    const scheduledTime = quiz.scheduledAt.toDate();
    return now >= scheduledTime;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />
        <div className="ml-64 pt-16 flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading quizzes...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Quiz MCQ Examination</h1>
            <p className="mt-2 text-gray-600">Take quizzes for your enrolled courses</p>
          </div>

          {availableQuizzes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableQuizzes.map((quiz) => (
                <div key={quiz.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <FileQuestion className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                        <p className="text-sm text-gray-500">{quiz.courseName}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isQuizAvailable(quiz) ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {isQuizAvailable(quiz) ? 'Available' : 'Scheduled'}
                    </span>
                  </div>

                  <p className="text-gray-600 mb-4">{quiz.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>Duration: {quiz.duration} minutes</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <FileQuestion className="w-4 h-4 mr-2" />
                      <span>Questions: {quiz.questionsCount}</span>
                    </div>
                    {quiz.scheduledAt && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>
                          Scheduled: {quiz.scheduledAt.toDate().toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    {isQuizAvailable(quiz) ? (
                      <Link
                        to={`/quiz/${quiz.id}`}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-center flex items-center justify-center"
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Start Quiz
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed flex items-center justify-center"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Not Available
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
              <FileQuestion className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No quizzes available</h3>
              <p className="mt-2 text-gray-500">
                There are no active quizzes for your enrolled courses at this time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentQuiz;