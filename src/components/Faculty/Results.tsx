import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Filter, Search, Eye, TrendingUp, Users, Award } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';

interface QuizResult {
  id: string;
  quizTitle: string;
  studentId: string;
  studentEmail: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  completedAt: any;
  status: string;
}

interface Quiz {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
}

const FacultyResults: React.FC = () => {
  const { currentUser } = useAuth();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredResults, setFilteredResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState('all');
  const [stats, setStats] = useState({
    totalAttempts: 0,
    averageScore: 0,
    passRate: 0,
    uniqueStudents: 0
  });

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  useEffect(() => {
    applyFilters();
    calculateStats();
  }, [results, searchTerm, selectedQuiz]);

  const fetchData = async () => {
    if (!currentUser) return;

    try {
      // Fetch faculty quizzes
      const quizzesQuery = query(
        collection(db, 'quizzes'),
        where('facultyId', '==', currentUser.uid)
      );
      const quizzesSnapshot = await getDocs(quizzesQuery);
      const quizzesData = quizzesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Quiz[];
      setQuizzes(quizzesData);

      // Fetch results for faculty quizzes
      const quizIds = quizzesData.map(q => q.id);
      if (quizIds.length > 0) {
        const resultsQuery = query(
          collection(db, 'quizResults'),
          orderBy('completedAt', 'desc')
        );
        const resultsSnapshot = await getDocs(resultsQuery);
        const allResults = resultsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as QuizResult[];

        // Filter results for faculty's quizzes
        const facultyResults = allResults.filter(result => 
          quizIds.some(quizId => result.quizTitle === quizzesData.find(q => q.id === quizId)?.title)
        );

        setResults(facultyResults);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Error loading results');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...results];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(result =>
        result.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.quizTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Quiz filter
    if (selectedQuiz !== 'all') {
      const selectedQuizData = quizzes.find(q => q.id === selectedQuiz);
      if (selectedQuizData) {
        filtered = filtered.filter(result => result.quizTitle === selectedQuizData.title);
      }
    }

    setFilteredResults(filtered);
  };

  const calculateStats = () => {
    const data = filteredResults;
    
    if (data.length === 0) {
      setStats({ totalAttempts: 0, averageScore: 0, passRate: 0, uniqueStudents: 0 });
      return;
    }

    const totalAttempts = data.length;
    const averageScore = Math.round(data.reduce((sum, result) => sum + result.score, 0) / totalAttempts);
    const passRate = Math.round((data.filter(result => result.score >= 60).length / totalAttempts) * 100);
    const uniqueStudents = new Set(data.map(result => result.studentId)).size;

    setStats({ totalAttempts, averageScore, passRate, uniqueStudents });
  };

  const exportResults = () => {
    const csvContent = [
      ['Student Email', 'Quiz Title', 'Score', 'Total Questions', 'Correct Answers', 'Time Spent (min)', 'Completed At', 'Status'],
      ...filteredResults.map(result => [
        result.studentEmail,
        result.quizTitle,
        result.score,
        result.totalQuestions,
        result.correctAnswers,
        Math.round((result.timeSpent || 0) / 60),
        result.completedAt?.toDate()?.toLocaleString() || 'N/A',
        result.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Results exported successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />
        <div className="ml-64 pt-16 flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading results...</p>
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
                <h1 className="text-3xl font-bold text-gray-900">Quiz Results</h1>
                <p className="mt-2 text-gray-600">Comprehensive quiz performance analysis</p>
              </div>
              <button
                onClick={exportResults}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Results
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Attempts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Average Score</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100">
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pass Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.passRate}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Unique Students</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.uniqueStudents}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students or quizzes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={selectedQuiz}
                  onChange={(e) => setSelectedQuiz(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
                >
                  <option value="all">All Quizzes</option>
                  {quizzes.map(quiz => (
                    <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
                  ))}
                </select>
              </div>

              <div className="text-sm text-gray-600 flex items-center">
                Showing {filteredResults.length} of {results.length} results
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quiz
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
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
                  {filteredResults.map((result) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.studentEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.quizTitle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.score >= 90 ? 'bg-green-100 text-green-800' :
                          result.score >= 70 ? 'bg-blue-100 text-blue-800' :
                          result.score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {result.score}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Math.round((result.timeSpent || 0) / 60)} min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.completedAt?.toDate()?.toLocaleDateString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {result.status}
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

            {filteredResults.length === 0 && (
              <div className="text-center py-12">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No quiz results match your current filters.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyResults;