import React, { useState, useEffect } from 'react';
import { FileQuestion, Play, Pause, Clock, Users, BarChart3, Calendar } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';

interface Quiz {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseName: string;
  facultyId: string;
  facultyName: string;
  duration: number;
  questionsCount: number;
  isActive: boolean;
  scheduledAt: any;
  createdAt: any;
}

const AdminQuizzes: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'quizzes'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const quizzesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Quiz[];
        
        setQuizzes(quizzesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching quizzes:', error);
        toast.error('Error loading quizzes');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleToggleQuiz = async (quizId: string, isActive: boolean) => {
    try {
      await updateDoc(doc(db, 'quizzes', quizId), {
        isActive: !isActive,
        updatedAt: new Date()
      });
      
      toast.success(`Quiz ${!isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error updating quiz status:', error);
      toast.error('Error updating quiz status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />
        <div className="ml-64 pt-16 flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading quizzes...</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    total: quizzes.length,
    active: quizzes.filter(q => q.isActive).length,
    scheduled: quizzes.filter(q => q.scheduledAt).length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Quiz Management</h1>
            <p className="mt-2 text-gray-600">Monitor and control quiz schedules across the platform</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <FileQuestion className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Quizzes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <Play className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Quizzes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100">
                  <Calendar className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Scheduled</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quizzes List */}
          <div className="space-y-4">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{quiz.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        quiz.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {quiz.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{quiz.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        <span>Faculty: {quiz.facultyName}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>Duration: {quiz.duration} min</span>
                      </div>
                      <div className="flex items-center">
                        <FileQuestion className="w-4 h-4 mr-1" />
                        <span>Questions: {quiz.questionsCount}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>
                          Created: {quiz.createdAt?.toDate ? 
                            new Date(quiz.createdAt.toDate()).toLocaleDateString() : 
                            'N/A'
                          }
                        </span>
                      </div>
                    </div>

                    {quiz.scheduledAt && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Scheduled for: {quiz.scheduledAt.toDate().toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleToggleQuiz(quiz.id, quiz.isActive)}
                      className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                        quiz.isActive
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {quiz.isActive ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Activate
                        </>
                      )}
                    </button>
                    
                    <button className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Results
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {quizzes.length === 0 && (
            <div className="text-center py-12">
              <FileQuestion className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No quizzes found</h3>
              <p className="mt-2 text-gray-500">
                Faculty members haven't created any quizzes yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminQuizzes;