import React, { useState, useEffect } from 'react';
import { Clock, BookOpen, Award, TrendingUp, PlayCircle, History, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

interface Quiz {
  id: string;
  title: string;
  description: string;
  duration: number;
  questionsCount: number;
  isActive: boolean;
  createdAt: any;
}

interface QuizResult {
  id: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completedAt: any;
  status: string;
}

const StudentDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    completedQuizzes: 0,
    averageScore: 0,
    bestScore: 0
  });
  const [recentResults, setRecentResults] = useState<QuizResult[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizzesLoading, setQuizzesLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
      setupRealtimeQuizzes();
    }
  }, [currentUser]);

  const fetchDashboardData = async () => {
    if (!currentUser) return;

    try {
      console.log('Fetching dashboard data for user:', currentUser.uid);
      
      // Fetch quiz results
      const resultsQuery = query(
        collection(db, 'quizResults'),
        where('studentId', '==', currentUser.uid),
        orderBy('completedAt', 'desc')
      );
      const resultsSnapshot = await getDocs(resultsQuery);
      const results = resultsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as QuizResult[];

      console.log('Fetched quiz results:', results);

      // Calculate stats
      const totalQuizzes = results.length;
      const completedQuizzes = results.filter(r => r.status === 'completed').length;
      const scores = results.map(r => r.score || 0);
      const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

      setStats({
        totalQuizzes,
        completedQuizzes,
        averageScore: Math.round(averageScore),
        bestScore
      });

      setRecentResults(results.slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeQuizzes = () => {
    console.log('Setting up real-time quiz listener...');
    
    // Real-time listener for quizzes
    const unsubscribe = onSnapshot(
      query(collection(db, 'quizzes'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        console.log('Quiz snapshot received:', snapshot.docs.length, 'documents');
        
        const quizzes = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Quiz data:', { id: doc.id, ...data });
          return {
            id: doc.id,
            ...data
          } as Quiz;
        });
        
        const activeQuizzes = quizzes.filter(q => q.isActive);
        console.log('Active quizzes:', activeQuizzes);
        
        setAvailableQuizzes(activeQuizzes);
        setQuizzesLoading(false);
        
        // Show notification for new quizzes
        if (activeQuizzes.length > availableQuizzes.length && !quizzesLoading) {
          toast.success('New quiz available!');
        }
      },
      (error) => {
        console.error('Error in quiz listener:', error);
        toast.error('Error loading quizzes');
        setQuizzesLoading(false);
      }
    );

    return () => unsubscribe();
  };

  const handleStartQuiz = (quizId: string) => {
    // Navigate to quiz interface
    window.location.href = `/quiz/${quizId}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back! Ready for your next quiz?</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Quizzes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalQuizzes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <Award className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedQuizzes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Best Score</p>
                <p className="text-2xl font-bold text-gray-900">{stats.bestScore}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Available Quizzes */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Available Quizzes</h2>
              <div className="flex items-center space-x-2">
                <PlayCircle className="w-6 h-6 text-blue-600" />
                {quizzesLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              {quizzesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading quizzes...</p>
                </div>
              ) : availableQuizzes.length > 0 ? (
                availableQuizzes.map((quiz) => (
                  <div key={quiz.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                      <span className="text-sm text-gray-500 flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {quiz.duration} min
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{quiz.description}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{quiz.questionsCount} questions</span>
                        <span className="flex items-center">
                          <BookOpen className="w-4 h-4 mr-1" />
                          Quiz
                        </span>
                      </div>
                      <button 
                        onClick={() => handleStartQuiz(quiz.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Start Quiz
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No quizzes available</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Check back later for new quizzes or contact your instructor.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Results */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recent Results</h2>
              <History className="w-6 h-6 text-green-600" />
            </div>
            
            <div className="space-y-4">
              {recentResults.length > 0 ? (
                recentResults.map((result) => (
                  <div key={result.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{result.quizTitle}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        result.score >= 80 ? 'bg-green-100 text-green-800' :
                        result.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {result.score}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>
                        {result.correctAnswers}/{result.totalQuestions} correct
                      </span>
                      <span>
                        {result.completedAt?.toDate ? 
                          new Date(result.completedAt.toDate()).toLocaleDateString() :
                          'N/A'
                        }
                      </span>
                    </div>
                    <div className="mt-2">
                      <Link
                        to={`/results/${result.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <History className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No quiz results yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Take your first quiz to see results here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left">
              <BookOpen className="w-8 h-8 text-blue-600 mb-2" />
              <h4 className="font-medium text-gray-900">Browse Quizzes</h4>
              <p className="text-sm text-gray-500">View all available quizzes</p>
            </button>
            
            <button className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left">
              <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
              <h4 className="font-medium text-gray-900">View Progress</h4>
              <p className="text-sm text-gray-500">Track your performance</p>
            </button>
            
            <button className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left">
              <Award className="w-8 h-8 text-purple-600 mb-2" />
              <h4 className="font-medium text-gray-900">Achievements</h4>
              <p className="text-sm text-gray-500">View your accomplishments</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;