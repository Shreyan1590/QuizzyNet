import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Award, Download, Filter, Calendar } from 'lucide-react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';

interface QuizResult {
  id: string;
  studentId: string;
  studentEmail: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  completedAt: any;
  status: string;
}

const ResultsAnalytics: React.FC = () => {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all');
  const [quizFilter, setQuizFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [analytics, setAnalytics] = useState({
    totalAttempts: 0,
    averageScore: 0,
    passRate: 0,
    averageTime: 0,
    topPerformers: [] as any[],
    scoreDistribution: {
      excellent: 0, // 90-100%
      good: 0,      // 70-89%
      average: 0,   // 50-69%
      poor: 0       // 0-49%
    }
  });

  useEffect(() => {
    fetchResults();
  }, []);

  useEffect(() => {
    applyFilters();
    calculateAnalytics();
  }, [results, dateFilter, quizFilter, scoreFilter]);

  const fetchResults = async () => {
    try {
      const resultsQuery = query(
        collection(db, 'quizResults'),
        orderBy('completedAt', 'desc')
      );
      const snapshot = await getDocs(resultsQuery);
      const resultsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as QuizResult[];
      
      setResults(resultsData);
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Error loading results');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...results];

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(result => 
        result.completedAt?.toDate() >= filterDate
      );
    }

    // Quiz filter
    if (quizFilter !== 'all') {
      filtered = filtered.filter(result => result.quizTitle === quizFilter);
    }

    // Score filter
    if (scoreFilter !== 'all') {
      switch (scoreFilter) {
        case 'excellent':
          filtered = filtered.filter(result => result.score >= 90);
          break;
        case 'good':
          filtered = filtered.filter(result => result.score >= 70 && result.score < 90);
          break;
        case 'average':
          filtered = filtered.filter(result => result.score >= 50 && result.score < 70);
          break;
        case 'poor':
          filtered = filtered.filter(result => result.score < 50);
          break;
      }
    }

    setFilteredResults(filtered);
  };

  const calculateAnalytics = () => {
    const data = filteredResults;
    
    if (data.length === 0) {
      setAnalytics({
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        averageTime: 0,
        topPerformers: [],
        scoreDistribution: { excellent: 0, good: 0, average: 0, poor: 0 }
      });
      return;
    }

    const totalAttempts = data.length;
    const averageScore = Math.round(data.reduce((sum, result) => sum + result.score, 0) / totalAttempts);
    const passRate = Math.round((data.filter(result => result.score >= 60).length / totalAttempts) * 100);
    const averageTime = Math.round(data.reduce((sum, result) => sum + (result.timeSpent || 0), 0) / totalAttempts / 60); // in minutes

    // Score distribution
    const scoreDistribution = {
      excellent: data.filter(result => result.score >= 90).length,
      good: data.filter(result => result.score >= 70 && result.score < 90).length,
      average: data.filter(result => result.score >= 50 && result.score < 70).length,
      poor: data.filter(result => result.score < 50).length
    };

    // Top performers
    const topPerformers = data
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(result => ({
        email: result.studentEmail,
        score: result.score,
        quiz: result.quizTitle
      }));

    setAnalytics({
      totalAttempts,
      averageScore,
      passRate,
      averageTime,
      topPerformers,
      scoreDistribution
    });
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

  const getUniqueQuizzes = () => {
    return [...new Set(results.map(result => result.quizTitle))];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Results Analytics</h1>
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

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date Range
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Quiz
              </label>
              <select
                value={quizFilter}
                onChange={(e) => setQuizFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Quizzes</option>
                {getUniqueQuizzes().map(quiz => (
                  <option key={quiz} value={quiz}>{quiz}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Award className="w-4 h-4 inline mr-1" />
                Score Range
              </label>
              <select
                value={scoreFilter}
                onChange={(e) => setScoreFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Scores</option>
                <option value="excellent">Excellent (90-100%)</option>
                <option value="good">Good (70-89%)</option>
                <option value="average">Average (50-69%)</option>
                <option value="poor">Poor (0-49%)</option>
              </select>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                Showing {filteredResults.length} of {results.length} results
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Attempts</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalAttempts}</p>
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
                <p className="text-2xl font-bold text-gray-900">{analytics.averageScore}%</p>
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
                <p className="text-2xl font-bold text-gray-900">{analytics.passRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Time</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.averageTime} min</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Score Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Distribution</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700">Excellent (90-100%)</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${analytics.totalAttempts > 0 ? (analytics.scoreDistribution.excellent / analytics.totalAttempts) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{analytics.scoreDistribution.excellent}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-700">Good (70-89%)</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${analytics.totalAttempts > 0 ? (analytics.scoreDistribution.good / analytics.totalAttempts) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{analytics.scoreDistribution.good}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-700">Average (50-69%)</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-600 h-2 rounded-full" 
                      style={{ width: `${analytics.totalAttempts > 0 ? (analytics.scoreDistribution.average / analytics.totalAttempts) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{analytics.scoreDistribution.average}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-700">Poor (0-49%)</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full" 
                      style={{ width: `${analytics.totalAttempts > 0 ? (analytics.scoreDistribution.poor / analytics.totalAttempts) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{analytics.scoreDistribution.poor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
            <div className="space-y-3">
              {analytics.topPerformers.map((performer, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-500' :
                      'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{performer.email}</p>
                      <p className="text-sm text-gray-500">{performer.quiz}</p>
                    </div>
                  </div>
                  <span className="font-bold text-green-600">{performer.score}%</span>
                </div>
              ))}
              {analytics.topPerformers.length === 0 && (
                <p className="text-gray-500 text-center py-4">No results available</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Results Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Results</h3>
          </div>
          
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredResults.slice(0, 20).map((result) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsAnalytics;