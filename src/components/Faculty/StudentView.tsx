import React, { useState } from 'react';
import { Search, User, BookOpen, Award, AlertTriangle, Calendar, Mail, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  registrationNumber: string;
  dateOfBirth: string;
  enrolledCourses: string[];
  disciplinaryActions: any[];
  isBlocked: boolean;
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

const FacultyStudentView: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentResults, setStudentResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    type: 'academic',
    reason: '',
    description: '',
    severity: 'low'
  });

  const searchStudent = async () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter a registration number');
      return;
    }

    setLoading(true);
    try {
      // Search for student by registration number
      const studentsQuery = query(
        collection(db, 'students'),
        where('registrationNumber', '==', searchTerm.trim())
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      
      if (studentsSnapshot.empty) {
        toast.error('Student not found');
        setSelectedStudent(null);
        return;
      }

      const studentData = {
        id: studentsSnapshot.docs[0].id,
        ...studentsSnapshot.docs[0].data()
      } as Student;

      setSelectedStudent(studentData);

      // Fetch student's quiz results
      const resultsQuery = query(
        collection(db, 'quizResults'),
        where('studentId', '==', studentData.id)
      );
      const resultsSnapshot = await getDocs(resultsQuery);
      const results = resultsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as QuizResult[];

      setStudentResults(results);
      toast.success('Student found successfully');
    } catch (error) {
      console.error('Error searching student:', error);
      toast.error('Error searching for student');
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !currentUser) return;

    try {
      // Here you would submit the report to admin for approval
      // For now, we'll just show a success message
      toast.success('Report submitted to admin for review');
      setShowReportModal(false);
      setReportForm({
        type: 'academic',
        reason: '',
        description: '',
        severity: 'low'
      });
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Error submitting report');
    }
  };

  const calculateStats = () => {
    if (studentResults.length === 0) {
      return { totalQuizzes: 0, averageScore: 0, bestScore: 0, passRate: 0 };
    }

    const totalQuizzes = studentResults.length;
    const scores = studentResults.map(r => r.score);
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const bestScore = Math.max(...scores);
    const passRate = Math.round((scores.filter(s => s >= 60).length / scores.length) * 100);

    return { totalQuizzes, averageScore, bestScore, passRate };
  };

  const stats = selectedStudent ? calculateStats() : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Student 360° View</h1>
            <p className="mt-2 text-gray-600">Comprehensive student information and performance analysis</p>
          </div>

          {/* Search Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Student</h2>
            <div className="flex space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter student registration number"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && searchStudent()}
                />
              </div>
              <button
                onClick={searchStudent}
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {selectedStudent && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Student Profile */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </h3>
                    <p className="text-gray-600">{selectedStudent.registrationNumber}</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-2 ${
                      selectedStudent.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedStudent.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <Mail className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-gray-900">{selectedStudent.email}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Phone className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-gray-900">{selectedStudent.phone}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-gray-900">{selectedStudent.dateOfBirth}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <BookOpen className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-gray-900">{selectedStudent.enrolledCourses?.length || 0} Courses</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4 inline mr-2" />
                      Report Student
                    </button>
                  </div>
                </div>

                {/* Performance Stats */}
                {stats && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Quizzes</span>
                        <span className="font-semibold text-gray-900">{stats.totalQuizzes}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Average Score</span>
                        <span className="font-semibold text-gray-900">{stats.averageScore}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Best Score</span>
                        <span className="font-semibold text-gray-900">{stats.bestScore}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Pass Rate</span>
                        <span className="font-semibold text-gray-900">{stats.passRate}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Information */}
              <div className="lg:col-span-2">
                {/* Quiz Results */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quiz Results</h3>
                  
                  {studentResults.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quiz</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {studentResults.map((result) => (
                            <tr key={result.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {result.quizTitle}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  result.score >= 80 ? 'bg-green-100 text-green-800' :
                                  result.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {result.score}%
                                </span>
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
                  ) : (
                    <div className="text-center py-8">
                      <Award className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No quiz results</h3>
                      <p className="mt-1 text-sm text-gray-500">This student hasn't taken any quizzes yet.</p>
                    </div>
                  )}
                </div>

                {/* Disciplinary Actions */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Disciplinary Actions</h3>
                  
                  {selectedStudent.disciplinaryActions && selectedStudent.disciplinaryActions.length > 0 ? (
                    <div className="space-y-4">
                      {selectedStudent.disciplinaryActions.map((action, index) => (
                        <div key={index} className="border border-red-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-red-900">{action.reason}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              action.severity === 'high' ? 'bg-red-100 text-red-800' :
                              action.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {action.severity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{action.description}</p>
                          <p className="text-xs text-gray-500">
                            Issued by: {action.issuedBy} • {action.issuedAt?.toDate()?.toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="mx-auto h-12 w-12 text-green-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No disciplinary actions</h3>
                      <p className="mt-1 text-sm text-gray-500">This student has a clean record.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Report Modal */}
          {showReportModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Student</h3>
                  
                  <form onSubmit={handleReport} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Report Type
                      </label>
                      <select
                        value={reportForm.type}
                        onChange={(e) => setReportForm({ ...reportForm, type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      >
                        <option value="academic">Academic Misconduct</option>
                        <option value="behavioral">Behavioral Issue</option>
                        <option value="attendance">Attendance Problem</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason
                      </label>
                      <input
                        type="text"
                        value={reportForm.reason}
                        onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Brief reason for report"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={reportForm.description}
                        onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        rows={4}
                        placeholder="Detailed description of the issue"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Severity
                      </label>
                      <select
                        value={reportForm.severity}
                        onChange={(e) => setReportForm({ ...reportForm, severity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowReportModal(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Submit Report
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyStudentView;