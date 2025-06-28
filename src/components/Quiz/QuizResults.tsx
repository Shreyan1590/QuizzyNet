import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Award, ArrowLeft, RotateCcw } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface QuizResult {
  id: string;
  quizTitle: string;
  studentId: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  timeSpent: number;
  completedAt: any;
  detailedResults: Array<{
    questionId: string;
    question: string;
    options: string[];
    userAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    explanation?: string;
  }>;
  status: string;
}

const QuizResults: React.FC = () => {
  const { resultId } = useParams<{ resultId: string }>();
  const { currentUser } = useAuth();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetailedResults, setShowDetailedResults] = useState(false);

  useEffect(() => {
    fetchResult();
  }, [resultId]);

  const fetchResult = async () => {
    if (!resultId || !currentUser) return;

    try {
      const resultDoc = await getDoc(doc(db, 'quizResults', resultId));
      if (resultDoc.exists()) {
        const resultData = { id: resultDoc.id, ...resultDoc.data() } as QuizResult;
        
        // Verify the result belongs to the current user
        if (resultData.studentId === currentUser.uid) {
          setResult(resultData);
        }
      }
    } catch (error) {
      console.error('Error fetching result:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-blue-100';
    if (score >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getPerformanceMessage = (score: number) => {
    if (score >= 90) return 'Excellent work! Outstanding performance!';
    if (score >= 70) return 'Great job! You did well!';
    if (score >= 50) return 'Good effort! Keep practicing!';
    return 'Keep studying and try again!';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Result not found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The quiz result you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <div className="mt-6">
            <Link
              to="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Quiz Results</h1>
          <p className="mt-2 text-gray-600">{result.quizTitle}</p>
        </div>

        {/* Score Card */}
        <div className={`bg-white rounded-lg shadow-lg p-8 mb-8 border-l-4 ${
          result.score >= 90 ? 'border-green-500' :
          result.score >= 70 ? 'border-blue-500' :
          result.score >= 50 ? 'border-yellow-500' :
          'border-red-500'
        }`}>
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreBgColor(result.score)} mb-4`}>
              <span className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
                {result.score}%
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {getPerformanceMessage(result.score)}
            </h2>
            <p className="text-gray-600">
              You scored {result.correctAnswers} out of {result.totalQuestions} questions correctly
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Final Score</p>
                <p className="text-2xl font-bold text-gray-900">{result.score}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Correct</p>
                <p className="text-2xl font-bold text-gray-900">{result.correctAnswers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Incorrect</p>
                <p className="text-2xl font-bold text-gray-900">
                  {result.totalQuestions - result.correctAnswers}
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
                <p className="text-sm font-medium text-gray-500">Time Spent</p>
                <p className="text-2xl font-bold text-gray-900">{formatTime(result.timeSpent)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Results Toggle */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Question-by-Question Review</h3>
            <button
              onClick={() => setShowDetailedResults(!showDetailedResults)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {showDetailedResults ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
        </div>

        {/* Detailed Results */}
        {showDetailedResults && (
          <div className="space-y-6">
            {result.detailedResults.map((questionResult, index) => (
              <div key={questionResult.questionId} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-sm font-medium text-gray-500 mr-3">
                        Question {index + 1}
                      </span>
                      {questionResult.isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                      {questionResult.question}
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {questionResult.options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className={`p-3 rounded-lg border-2 ${
                        optionIndex === questionResult.correctAnswer
                          ? 'border-green-500 bg-green-50 text-green-800'
                          : optionIndex === questionResult.userAnswer && !questionResult.isCorrect
                          ? 'border-red-500 bg-red-50 text-red-800'
                          : 'border-gray-200 bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="font-medium mr-2">
                          {String.fromCharCode(65 + optionIndex)}.
                        </span>
                        <span>{option}</span>
                        {optionIndex === questionResult.correctAnswer && (
                          <CheckCircle className="w-4 h-4 ml-auto text-green-600" />
                        )}
                        {optionIndex === questionResult.userAnswer && !questionResult.isCorrect && (
                          <XCircle className="w-4 h-4 ml-auto text-red-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {questionResult.explanation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-2">Explanation:</h5>
                    <p className="text-blue-800">{questionResult.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Print Results
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;