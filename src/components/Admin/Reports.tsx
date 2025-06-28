import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Filter, TrendingUp, Users, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Adjust the import path as needed
import { toast } from 'react-hot-toast';

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('comprehensive');
  const [dateRange, setDateRange] = useState('month');
  const [reportData, setReportData] = useState<any>(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Fetch data from Supabase
      const [
        { data: resultsData, error: resultsError },
        { data: studentsData, error: studentsError },
        { data: quizzesData, error: quizzesError }
      ] = await Promise.all([
        supabase.from('quiz_results').select('*'),
        supabase.from('users').select('*').eq('role', 'student'),
        supabase.from('quizzes').select('*')
      ]);

      if (resultsError || studentsError || quizzesError) {
        throw resultsError || studentsError || quizzesError;
      }

      // Convert to arrays
      const results = resultsData || [];
      const students = studentsData || [];
      const quizzes = quizzesData || [];

      // Generate report based on type
      let data = {};
      
      switch (reportType) {
        case 'comprehensive':
          data = generateComprehensiveReport(results, students, quizzes, startDate, endDate);
          break;
        case 'student-performance':
          data = generateStudentPerformanceReport(results, students, startDate, endDate);
          break;
        case 'quiz-analytics':
          data = generateQuizAnalyticsReport(results, quizzes, startDate, endDate);
          break;
        case 'security':
          data = generateSecurityReport(students, startDate, endDate);
          break;
      }

      setReportData(data);
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const generateComprehensiveReport = (results: any[], students: any[], quizzes: any[], startDate: Date, endDate: Date) => {
    const filteredResults = results.filter(result => {
      const resultDate = result.completedAt?.toDate();
      return resultDate >= startDate && resultDate <= endDate;
    });

    return {
      summary: {
        totalStudents: students.length,
        activeStudents: students.filter(s => !s.isBlocked).length,
        totalQuizzes: quizzes.length,
        activeQuizzes: quizzes.filter(q => q.isActive).length,
        totalAttempts: filteredResults.length,
        averageScore: Math.round(filteredResults.reduce((sum, r) => sum + (r.score || 0), 0) / filteredResults.length || 0),
        passRate: Math.round((filteredResults.filter(r => (r.score || 0) >= 60).length / filteredResults.length) * 100 || 0)
      },
      topPerformers: filteredResults
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 10)
        .map(r => ({
          student: r.studentEmail,
          quiz: r.quizTitle,
          score: r.score,
          date: r.completedAt?.toDate()?.toLocaleDateString()
        })),
      quizPerformance: quizzes.map(quiz => {
        const quizResults = filteredResults.filter(r => r.quizTitle === quiz.title);
        return {
          title: quiz.title,
          attempts: quizResults.length,
          averageScore: Math.round(quizResults.reduce((sum, r) => sum + (r.score || 0), 0) / quizResults.length || 0),
          passRate: Math.round((quizResults.filter(r => (r.score || 0) >= 60).length / quizResults.length) * 100 || 0)
        };
      }),
      securityIssues: students.filter(s => (s.tabSwitchCount || 0) > 0).length
    };
  };

  const generateStudentPerformanceReport = (results: any[], students: any[], startDate: Date, endDate: Date) => {
    const filteredResults = results.filter(result => {
      const resultDate = result.completedAt?.toDate();
      return resultDate >= startDate && resultDate <= endDate;
    });

    return {
      studentStats: students.map(student => {
        const studentResults = filteredResults.filter(r => r.studentId === student.id);
        return {
          name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email,
          email: student.email,
          totalAttempts: studentResults.length,
          averageScore: Math.round(studentResults.reduce((sum, r) => sum + (r.score || 0), 0) / studentResults.length || 0),
          bestScore: Math.max(...studentResults.map(r => r.score || 0), 0),
          violations: student.tabSwitchCount || 0,
          status: student.isBlocked ? 'Blocked' : 'Active'
        };
      }).sort((a, b) => b.averageScore - a.averageScore)
    };
  };

  const generateQuizAnalyticsReport = (results: any[], quizzes: any[], startDate: Date, endDate: Date) => {
    const filteredResults = results.filter(result => {
      const resultDate = result.completedAt?.toDate();
      return resultDate >= startDate && resultDate <= endDate;
    });

    return {
      quizAnalytics: quizzes.map(quiz => {
        const quizResults = filteredResults.filter(r => r.quizTitle === quiz.title);
        const scores = quizResults.map(r => r.score || 0);
        
        return {
          title: quiz.title,
          totalAttempts: quizResults.length,
          averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length || 0),
          highestScore: Math.max(...scores, 0),
          lowestScore: Math.min(...scores, 100),
          passRate: Math.round((scores.filter(s => s >= 60).length / scores.length) * 100 || 0),
          averageTime: Math.round(quizResults.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / quizResults.length / 60 || 0),
          difficulty: quiz.difficulty || 'Medium',
          isActive: quiz.isActive
        };
      }).sort((a, b) => b.totalAttempts - a.totalAttempts)
    };
  };

  const generateSecurityReport = (students: any[], startDate: Date, endDate: Date) => {
    return {
      securitySummary: {
        totalStudents: students.length,
        studentsWithViolations: students.filter(s => (s.tabSwitchCount || 0) > 0).length,
        blockedStudents: students.filter(s => s.isBlocked).length,
        totalViolations: students.reduce((sum, s) => sum + (s.tabSwitchCount || 0), 0)
      },
      violationDetails: students
        .filter(s => (s.tabSwitchCount || 0) > 0)
        .map(student => ({
          name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email,
          email: student.email,
          violations: student.tabSwitchCount || 0,
          isBlocked: student.isBlocked,
          lastActivity: student.lastActivity?.toDate()?.toLocaleDateString() || 'N/A'
        }))
        .sort((a, b) => b.violations - a.violations)
    };
  };

  const exportReport = () => {
    if (!reportData) {
      toast.error('No report data to export');
      return;
    }

    let csvContent = '';
    const timestamp = new Date().toISOString().split('T')[0];

    switch (reportType) {
      case 'comprehensive':
        csvContent = generateComprehensiveCSV(reportData);
        break;
      case 'student-performance':
        csvContent = generateStudentPerformanceCSV(reportData);
        break;
      case 'quiz-analytics':
        csvContent = generateQuizAnalyticsCSV(reportData);
        break;
      case 'security':
        csvContent = generateSecurityCSV(reportData);
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report_${timestamp}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const generateComprehensiveCSV = (data: any) => {
    let csv = 'COMPREHENSIVE REPORT\n\n';
    csv += 'SUMMARY\n';
    csv += 'Metric,Value\n';
    csv += `Total Students,${data.summary.totalStudents}\n`;
    csv += `Active Students,${data.summary.activeStudents}\n`;
    csv += `Total Quizzes,${data.summary.totalQuizzes}\n`;
    csv += `Active Quizzes,${data.summary.activeQuizzes}\n`;
    csv += `Total Attempts,${data.summary.totalAttempts}\n`;
    csv += `Average Score,${data.summary.averageScore}%\n`;
    csv += `Pass Rate,${data.summary.passRate}%\n\n`;

    csv += 'TOP PERFORMERS\n';
    csv += 'Student,Quiz,Score,Date\n';
    data.topPerformers.forEach((performer: any) => {
      csv += `${performer.student},${performer.quiz},${performer.score}%,${performer.date}\n`;
    });

    return csv;
  };

  const generateStudentPerformanceCSV = (data: any) => {
    let csv = 'STUDENT PERFORMANCE REPORT\n\n';
    csv += 'Name,Email,Total Attempts,Average Score,Best Score,Violations,Status\n';
    data.studentStats.forEach((student: any) => {
      csv += `${student.name},${student.email},${student.totalAttempts},${student.averageScore}%,${student.bestScore}%,${student.violations},${student.status}\n`;
    });
    return csv;
  };

  const generateQuizAnalyticsCSV = (data: any) => {
    let csv = 'QUIZ ANALYTICS REPORT\n\n';
    csv += 'Quiz Title,Total Attempts,Average Score,Highest Score,Lowest Score,Pass Rate,Average Time (min),Status\n';
    data.quizAnalytics.forEach((quiz: any) => {
      csv += `${quiz.title},${quiz.totalAttempts},${quiz.averageScore}%,${quiz.highestScore}%,${quiz.lowestScore}%,${quiz.passRate}%,${quiz.averageTime},${quiz.isActive ? 'Active' : 'Inactive'}\n`;
    });
    return csv;
  };

  const generateSecurityCSV = (data: any) => {
    let csv = 'SECURITY REPORT\n\n';
    csv += 'SUMMARY\n';
    csv += 'Metric,Value\n';
    csv += `Total Students,${data.securitySummary.totalStudents}\n`;
    csv += `Students with Violations,${data.securitySummary.studentsWithViolations}\n`;
    csv += `Blocked Students,${data.securitySummary.blockedStudents}\n`;
    csv += `Total Violations,${data.securitySummary.totalViolations}\n\n`;

    csv += 'VIOLATION DETAILS\n';
    csv += 'Name,Email,Violations,Status,Last Activity\n';
    data.violationDetails.forEach((student: any) => {
      csv += `${student.name},${student.email},${student.violations},${student.isBlocked ? 'Blocked' : 'Active'},${student.lastActivity}\n`;
    });
    return csv;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="mt-2 text-gray-600">Generate comprehensive reports and analytics</p>
        </div>

        {/* Report Configuration */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Report Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="comprehensive">Comprehensive Report</option>
                <option value="student-performance">Student Performance</option>
                <option value="quiz-analytics">Quiz Analytics</option>
                <option value="security">Security Report</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="quarter">Last 3 Months</option>
                <option value="year">Last Year</option>
              </select>
            </div>

            <div className="flex items-end space-x-3">
              <button
                onClick={generateReport}
                disabled={loading}
                className={`flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
              
              {reportData && (
                <button
                  onClick={exportReport}
                  className="py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Report Display */}
        {reportData && (
          <div className="space-y-8">
            {reportType === 'comprehensive' && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-blue-100">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Total Students</p>
                        <p className="text-2xl font-bold text-gray-900">{reportData.summary.totalStudents}</p>
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
                        <p className="text-2xl font-bold text-gray-900">{reportData.summary.averageScore}%</p>
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
                        <p className="text-2xl font-bold text-gray-900">{reportData.summary.passRate}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-red-100">
                        <Filter className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Security Issues</p>
                        <p className="text-2xl font-bold text-gray-900">{reportData.securityIssues}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Performers */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quiz</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.topPerformers.map((performer: any, index: number) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {performer.student}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {performer.quiz}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                {performer.score}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {performer.date}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {reportType === 'student-performance' && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Student Performance Report</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Best Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Violations</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.studentStats.map((student: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {student.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.totalAttempts}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              student.averageScore >= 80 ? 'bg-green-100 text-green-800' :
                              student.averageScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {student.averageScore}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.bestScore}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {student.violations > 0 ? (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                {student.violations}
                              </span>
                            ) : (
                              <span className="text-green-600 text-sm">Clean</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              student.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {student.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Add similar displays for other report types */}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;