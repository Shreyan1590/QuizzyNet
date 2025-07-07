import React, { useState } from 'react';
import { Upload, Download, FileText, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';

interface QuizData {
  title: string;
  description: string;
  courseId: string;
  duration: number;
  questionsCount: number;
  maxAttempts: number;
  passingScore: number;
  allowReview: boolean;
  shuffleQuestions: boolean;
  scheduledAt: string;
  questions: QuestionData[];
}

interface QuestionData {
  question: string;
  options: string[];
  correctAnswer: number; // 0-based index
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  points: number;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

const BulkQuizUpload: React.FC<{ onClose: () => void; courses: any[] }> = ({ onClose, courses }) => {
  const { currentUser, userData } = useAuth();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [quizInfo, setQuizInfo] = useState({
    title: '',
    description: '',
    courseId: courses[0]?.id || '',
    duration: 30,
    maxAttempts: 3,
    passingScore: 70,
    allowReview: true,
    shuffleQuestions: true,
    scheduledAt: ''
  });
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<'quiz-info' | 'upload' | 'preview' | 'processing'>('quiz-info');
  const [uploadProgress, setUploadProgress] = useState(0);

  const downloadTemplate = () => {
    const template = [
      ['Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer (1-4)', 'Difficulty', 'Category', 'Explanation'],
      ['"What is the capital of France?"', '"London"', '"Berlin"', '"Paris"', '"Madrid"', '3', '"easy"', '"Geography"', '"Paris is the capital and largest city of France."'],
      ['"Which planet is known as the Red Planet?"', '"Venus"', '"Mars"', '"Jupiter"', '"Saturn"', '2', '"easy"', '"Science"', '"Mars is called the Red Planet due to its reddish appearance."']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded successfully');
  };

  const handleQuizInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setQuizInfo(prev => ({ ...prev, [name]: val }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size exceeds 10MB limit');
      return;
    }

    setCsvFile(file);
    parseCSV(file);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV file must contain at least a header row and one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const expectedHeaders = [
        'Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 
        'Correct Answer (1-4)', 'Difficulty', 'Category', 'Explanation'
      ];
      
      // Validate headers
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
        return;
      }

      const parsedQuestions: QuestionData[] = [];
      const errors: ValidationError[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Validate question text
        if (!row['Question']) {
          errors.push({ row: i + 1, field: 'Question', message: 'Question text is required' });
        }

        // Validate options
        const options = [
          row['Option 1'],
          row['Option 2'],
          row['Option 3'],
          row['Option 4']
        ].filter(opt => opt);

        if (options.length < 2) {
          errors.push({ row: i + 1, field: 'Options', message: 'At least 2 options are required' });
        }

        // Validate correct answer
        const correctAnswer = parseInt(row['Correct Answer (1-4)']) - 1; // Convert to 0-based index
        if (isNaN(correctAnswer) {
          errors.push({ row: i + 1, field: 'Correct Answer (1-4)', message: 'Correct answer must be a number between 1 and 4' });
        } else if (correctAnswer < 0 || correctAnswer >= options.length) {
          errors.push({ row: i + 1, field: 'Correct Answer (1-4)', message: 'Correct answer must correspond to one of the options' });
        }

        // Validate difficulty
        const difficulty = row['Difficulty'].toLowerCase();
        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
          errors.push({ row: i + 1, field: 'Difficulty', message: 'Difficulty must be easy, medium, or hard' });
        }

        parsedQuestions.push({
          question: row['Question'],
          options,
          correctAnswer,
          explanation: row['Explanation'],
          difficulty: difficulty as 'easy' | 'medium' | 'hard',
          category: row['Category'] || 'General',
          points: 1 // Default points
        });
      }

      setQuestions(parsedQuestions);
      setValidationErrors(errors);
      setStep('preview');
    };

    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before uploading');
      return;
    }

    if (questions.length === 0) {
      toast.error('No questions found to upload');
      return;
    }

    setUploading(true);
    setStep('processing');
    setUploadProgress(0);

    try {
      // Create quiz document
      const quizRef = await addDoc(collection(db, 'quizzes'), {
        ...quizInfo,
        questionsCount: questions.length,
        facultyId: currentUser?.uid,
        facultyName: `${userData?.firstName} ${userData?.lastName}`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Add questions to the subcollection
      const questionsCollectionRef = collection(db, 'quizzes', quizRef.id, 'questions');
      const totalQuestions = questions.length;
      
      for (let i = 0; i < questions.length; i++) {
        await addDoc(questionsCollectionRef, {
          ...questions[i],
          quizId: quizRef.id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        setUploadProgress(Math.round(((i + 1) / totalQuestions) * 100));
      }

      toast.success(`Successfully created quiz "${quizInfo.title}" with ${questions.length} questions`);
      onClose();
    } catch (error) {
      console.error('Error during upload:', error);
      toast.error('Error during upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Bulk Quiz Upload</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {step === 'quiz-info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Title*</label>
                  <input
                    type="text"
                    name="title"
                    value={quizInfo.title}
                    onChange={handleQuizInfoChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course*</label>
                  <select
                    name="courseId"
                    value={quizInfo.courseId}
                    onChange={handleQuizInfoChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)*</label>
                  <input
                    type="number"
                    name="duration"
                    min="1"
                    max="300"
                    value={quizInfo.duration}
                    onChange={handleQuizInfoChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Attempts*</label>
                  <input
                    type="number"
                    name="maxAttempts"
                    min="1"
                    max="10"
                    value={quizInfo.maxAttempts}
                    onChange={handleQuizInfoChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passing Score (%)*</label>
                  <input
                    type="number"
                    name="passingScore"
                    min="0"
                    max="100"
                    value={quizInfo.passingScore}
                    onChange={handleQuizInfoChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled At</label>
                  <input
                    type="datetime-local"
                    name="scheduledAt"
                    value={quizInfo.scheduledAt}
                    onChange={handleQuizInfoChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description*</label>
                <textarea
                  name="description"
                  value={quizInfo.description}
                  onChange={handleQuizInfoChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  required
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="allowReview"
                    checked={quizInfo.allowReview}
                    onChange={handleQuizInfoChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">Allow Review</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="shuffleQuestions"
                    checked={quizInfo.shuffleQuestions}
                    onChange={handleQuizInfoChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">Shuffle Questions</label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={!quizInfo.title || !quizInfo.description || !quizInfo.courseId}
                >
                  Next: Upload Questions
                </button>
              </div>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mb-4">
                  <button
                    onClick={downloadTemplate}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV Template
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Download the template first, fill in your questions, then upload the completed CSV file.
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900">Upload CSV File</p>
                  <p className="text-sm text-gray-500">Maximum file size: 10MB</p>
                </div>
                <div className="mt-4">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Choose CSV File
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Required columns: Question, Option 1, Option 2, Option 3, Option 4, Correct Answer (1-4), Difficulty, Category, Explanation</li>
                  <li>• Correct Answer should be a number between 1-4 (1 for Option 1, 2 for Option 2, etc.)</li>
                  <li>• Difficulty levels: easy, medium, hard</li>
                  <li>• At least 2 options are required for each question</li>
                </ul>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('quiz-info')}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-gray-900">Preview & Validation</h4>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {questions.length} questions found
                  </span>
                  {validationErrors.length === 0 ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      <span className="text-sm">All valid</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      <span className="text-sm">{validationErrors.length} errors</span>
                    </div>
                  )}
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h5 className="font-medium text-red-900 mb-2">Validation Errors:</h5>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {validationErrors.map((error, index) => (
                      <p key={index} className="text-sm text-red-800">
                        Row {error.row}, {error.field}: {error.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto max-h-96 border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Options</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Correct Answer</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {questions.slice(0, 10).map((q, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{q.question}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          <ol className="list-decimal list-inside">
                            {q.options.map((opt, i) => (
                              <li key={i} className={i === q.correctAnswer ? 'text-green-600 font-medium' : ''}>
                                {opt}
                              </li>
                            ))}
                          </ol>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">{q.options[q.correctAnswer]}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 capitalize">{q.difficulty}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{q.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {questions.length > 10 && (
                <p className="text-sm text-gray-500 text-center">
                  Showing first 10 questions. {questions.length - 10} more questions will be uploaded.
                </p>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleUpload}
                  disabled={validationErrors.length > 0 || questions.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Quiz with {questions.length} Questions
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="space-y-6 text-center">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              </div>
              
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Uploading Quiz...</h4>
                <p className="text-sm text-gray-600 mb-4">Please wait while we process your quiz and questions.</p>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">{uploadProgress}% complete</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkQuizUpload;