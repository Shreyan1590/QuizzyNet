import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Play, Pause, Clock, Users, BookOpen } from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';

interface Quiz {
  id: string;
  title: string;
  description: string;
  duration: number;
  questionsCount: number;
  isActive: boolean;
  createdAt: any;
  totalAttempts: number;
  averageScore: number;
}

const QuizManagement: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 30,
    questionsCount: 10,
    isActive: true
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'quizzes'),
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

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await addDoc(collection(db, 'quizzes'), {
        ...formData,
        createdAt: new Date(),
        totalAttempts: 0,
        averageScore: 0
      });
      
      toast.success('Quiz created successfully');
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error('Error creating quiz');
    }
  };

  const handleUpdateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingQuiz) return;
    
    try {
      await updateDoc(doc(db, 'quizzes', editingQuiz.id), formData);
      
      toast.success('Quiz updated successfully');
      setEditingQuiz(null);
      resetForm();
    } catch (error) {
      console.error('Error updating quiz:', error);
      toast.error('Error updating quiz');
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    
    try {
      await deleteDoc(doc(db, 'quizzes', quizId));
      toast.success('Quiz deleted successfully');
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error('Error deleting quiz');
    }
  };

  const handleToggleActive = async (quiz: Quiz) => {
    try {
      await updateDoc(doc(db, 'quizzes', quiz.id), {
        isActive: !quiz.isActive
      });
      
      toast.success(`Quiz ${!quiz.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling quiz status:', error);
      toast.error('Error updating quiz status');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      duration: 30,
      questionsCount: 10,
      isActive: true
    });
  };

  const openEditModal = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setFormData({
      title: quiz.title,
      description: quiz.description,
      duration: quiz.duration,
      questionsCount: quiz.questionsCount,
      isActive: quiz.isActive
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quiz Management</h1>
              <p className="mt-2 text-gray-600">Create and manage quiz configurations</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Quiz
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Quizzes</p>
                <p className="text-2xl font-bold text-gray-900">{quizzes.length}</p>
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
                <p className="text-2xl font-bold text-gray-900">
                  {quizzes.filter(q => q.isActive).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <Users className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Attempts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {quizzes.reduce((sum, quiz) => sum + (quiz.totalAttempts || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Duration</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(quizzes.reduce((sum, quiz) => sum + quiz.duration, 0) / quizzes.length || 0)} min
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quizzes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{quiz.title}</h3>
                  <p className="text-gray-600 text-sm mb-3">{quiz.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleActive(quiz)}
                    className={`p-2 rounded-lg transition-colors ${
                      quiz.isActive
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {quiz.isActive ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Duration:</span>
                  <span className="font-medium">{quiz.duration} minutes</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Questions:</span>
                  <span className="font-medium">{quiz.questionsCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Attempts:</span>
                  <span className="font-medium">{quiz.totalAttempts || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Avg Score:</span>
                  <span className="font-medium">{quiz.averageScore || 0}%</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  quiz.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {quiz.isActive ? 'Active' : 'Inactive'}
                </span>

                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(quiz)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteQuiz(quiz.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create/Edit Modal */}
        {(showCreateModal || editingQuiz) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}
                </h3>
                
                <form onSubmit={editingQuiz ? handleUpdateQuiz : handleCreateQuiz} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quiz Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        value={formData.questionsCount}
                        onChange={(e) => setFormData({ ...formData, questionsCount: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                      Active (students can take this quiz)
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setEditingQuiz(null);
                        resetForm();
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {editingQuiz ? 'Update Quiz' : 'Create Quiz'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizManagement;