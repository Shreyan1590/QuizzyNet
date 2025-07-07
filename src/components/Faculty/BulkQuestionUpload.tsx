import React, { useState } from 'react';
import { Upload, Download, FileText, CheckCircle, AlertTriangle, X, Eye, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import Papa from 'papaparse';

interface Question {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  questionType: 'MCQ' | 'True-False' | 'Short Answer';
  marks: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  explanation?: string;
  category?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface BulkQuestionUploadProps {
  onClose: () => void;
  quizzes: Array<{ id: string; title: string; courseCode: string; courseName: string }>;
}

const BulkQuestionUpload: React.FC<BulkQuestionUploadProps> = ({ onClose, quizzes }) => {
  const { currentUser, userData } = useAuth();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<Question[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'processing'>('upload');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedQuiz, setSelectedQuiz] = useState<string>('');

  const downloadTemplate = () => {
    const template = [
      ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'questionType', 'marks', 'difficulty', 'explanation', 'category']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz_questions_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded successfully');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast.error('File size exceeds 50MB limit');
      return;
    }

    setCsvFile(file);
    parseCSV(file);
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast.error('CSV parsing errors detected');
          console.error('CSV parsing errors:', results.errors);
          return;
        }

        const data = results.data as any[];
        if (data.length === 0) {
          toast.error('CSV file is empty');
          return;
        }

        validateAndProcessData(data);
      },
      error: (error) => {
        toast.error('Error reading CSV file');
        console.error('CSV parsing error:', error);
      }
    });
  };

  const validateAndProcessData = (data: any[]) => {
    const questions: Question[] = [];
    const errors: ValidationError[] = [];
    const requiredFields = ['questionText', 'correctAnswer', 'questionType', 'marks', 'difficulty'];

    data.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because index starts at 0 and we have a header row

      // Check required fields
      requiredFields.forEach(field => {
        if (!row[field] || row[field].toString().trim() === '') {
          errors.push({
            row: rowNumber,
            field,
            message: `${field} is required`
          });
        }
      });

      // Validate question type
      const validQuestionTypes = ['MCQ', 'True-False', 'Short Answer'];
      if (row.questionType && !validQuestionTypes.includes(row.questionType)) {
        errors.push({
          row: rowNumber,
          field: 'questionType',
          message: 'Question type must be MCQ, True-False, or Short Answer'
        });
      }

      // Validate difficulty
      const validDifficulties = ['Easy', 'Medium', 'Hard'];
      if (row.difficulty && !validDifficulties.includes(row.difficulty)) {
        errors.push({
          row: rowNumber,
          field: 'difficulty',
          message: 'Difficulty must be Easy, Medium, or Hard'
        });
      }

      // Validate marks
      const marks = parseInt(row.marks);
      if (isNaN(marks) || marks < 1 || marks > 10) {
        errors.push({
          row: rowNumber,
          field: 'marks',
          message: 'Marks must be a number between 1 and 10'
        });
      }

      // Validate MCQ specific fields
      if (row.questionType === 'MCQ') {
        if (!row.optionA || !row.optionB) {
          errors.push({
            row: rowNumber,
            field: 'options',
            message: 'MCQ questions must have at least options A and B'
          });
        }

        const validAnswers = ['A', 'B', 'C', 'D'];
        if (!validAnswers.includes(row.correctAnswer?.toUpperCase())) {
          errors.push({
            row: rowNumber,
            field: 'correctAnswer',
            message: 'MCQ correct answer must be A, B, C, or D'
          });
        }
      }

      // Validate True-False specific fields
      if (row.questionType === 'True-False') {
        const validTFAnswers = ['A', 'B', 'True', 'False'];
        if (!validTFAnswers.includes(row.correctAnswer)) {
          errors.push({
            row: rowNumber,
            field: 'correctAnswer',
            message: 'True-False correct answer must be A, B, True, or False'
          });
        }
      }

      // Create question object if no critical errors for this row
      const rowErrors = errors.filter(e => e.row === rowNumber);
      if (rowErrors.length === 0) {
        questions.push({
          questionText: row.questionText?.trim() || '',
          optionA: row.optionA?.trim() || '',
          optionB: row.optionB?.trim() || '',
          optionC: row.optionC?.trim() || '',
          optionD: row.optionD?.trim() || '',
          correctAnswer: row.correctAnswer?.trim() || '',
          questionType: row.questionType as 'MCQ' | 'True-False' | 'Short Answer',
          marks: parseInt(row.marks) || 1,
          difficulty: row.difficulty as 'Easy' | 'Medium' | 'Hard',
          explanation: row.explanation?.trim() || '',
          category: row.category?.trim() || ''
        });
      }
    });

    setCsvData(questions);
    setValidationErrors(errors);
    setStep('preview');
  };

  const checkForDuplicates = async (questions: Question[], quizId: string) => {
    try {
      const questionsQuery = query(
        collection(db, 'quizzes', quizId, 'questions')
      );
      const existingQuestions = await getDocs(questionsQuery);
      const existingTexts = existingQuestions.docs.map(doc => 
        doc.data().questionText?.toLowerCase().trim()
      );

      const duplicates: string[] = [];
      questions.forEach(question => {
        const questionText = question.questionText.toLowerCase().trim();
        if (existingTexts.includes(questionText)) {
          duplicates.push(question.questionText);
        }
      });

      return duplicates;
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return [];
    }
  };

  const handleUpload = async () => {
    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before uploading');
      return;
    }

    if (!selectedQuiz) {
      toast.error('Please select a quiz to upload questions to');
      return;
    }

    setUploading(true);
    setStep('processing');
    setUploadProgress(0);

    try {
      // Check for duplicates
      const duplicates = await checkForDuplicates(csvData, selectedQuiz);
      if (duplicates.length > 0) {
        const confirmUpload = window.confirm(
          `Found ${duplicates.length} duplicate questions. Do you want to continue uploading the remaining questions?`
        );
        if (!confirmUpload) {
          setUploading(false);
          setStep('preview');
          return;
        }
      }

      const totalQuestions = csvData.length;
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < csvData.length; i++) {
        const question = csvData[i];
        
        try {
          // Skip duplicates
          if (duplicates.includes(question.questionText)) {
            continue;
          }

          const questionData = {
            questionText: question.questionText,
            options: question.questionType === 'Short Answer' ? [] : [
              question.optionA,
              question.optionB,
              question.optionC || '',
              question.optionD || ''
            ].filter(option => option.trim() !== ''),
            correctAnswer: question.questionType === 'Short Answer' ? '' : 
              question.correctAnswer.toUpperCase().charCodeAt(0) - 65, // Convert A,B,C,D to 0,1,2,3
            questionType: question.questionType,
            marks: question.marks,
            difficulty: question.difficulty,
            explanation: question.explanation,
            category: question.category,
            createdAt: new Date(),
            createdBy: currentUser?.uid,
            facultyName: `${userData?.firstName} ${userData?.lastName}`
          };

          // Add question to the quiz's questions subcollection
          await addDoc(collection(db, 'quizzes', selectedQuiz, 'questions'), questionData);
          successCount++;
        } catch (error) {
          console.error(`Error uploading question ${i + 1}:`, error);
          errorCount++;
          errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        setUploadProgress(Math.round(((i + 1) / totalQuestions) * 100));
        
        // Add small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Update quiz with new question count
      if (successCount > 0) {
        try {
          const selectedQuizData = quizzes.find(q => q.id === selectedQuiz);
          if (selectedQuizData) {
            await updateDoc(doc(db, 'quizzes', selectedQuiz), {
              questionsCount: successCount,
              lastUpdated: new Date()
            });
          }
        } catch (error) {
          console.error('Error updating quiz question count:', error);
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} questions`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to upload ${errorCount} questions`);
        console.error('Upload errors:', errors);
      }
      if (duplicates.length > 0) {
        toast.warning(`Skipped ${duplicates.length} duplicate questions`);
      }

      onClose();
    } catch (error) {
      console.error('Error during bulk upload:', error);
      toast.error('Error during bulk upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Bulk Question Upload</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

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
                  <p className="text-sm text-gray-500">Maximum file size: 50MB</p>
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
                  <li>• Required columns: questionText, correctAnswer, questionType, marks, difficulty</li>
                  <li>• Question types: MCQ, True-False, Short Answer</li>
                  <li>• Difficulty levels: Easy, Medium, Hard</li>
                  <li>• Marks: Number between 1-10</li>
                  <li>• MCQ correct answer: A, B, C, or D</li>
                  <li>• True-False correct answer: A, B, True, or False</li>
                  <li>• Optional columns: explanation, category</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-gray-900">Preview & Validation</h4>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {csvData.length} questions found
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

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Quiz to Upload Questions To:
                </label>
                <select
                  value={selectedQuiz}
                  onChange={(e) => setSelectedQuiz(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a Quiz</option>
                  {quizzes.map(quiz => (
                    <option key={quiz.id} value={quiz.id}>
                      {quiz.courseCode} - {quiz.title}
                    </option>
                  ))}
                </select>
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

              <div className="overflow-x-auto max-h-64 border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Marks</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Answer</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {csvData.slice(0, 10).map((question, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                          {question.questionText}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">{question.questionType}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{question.difficulty}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{question.marks}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{question.correctAnswer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {csvData.length > 10 && (
                <p className="text-sm text-gray-500 text-center">
                  Showing first 10 questions. {csvData.length - 10} more questions will be uploaded.
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
                  disabled={validationErrors.length > 0 || !selectedQuiz}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload {csvData.length} Questions
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
                <h4 className="text-lg font-medium text-gray-900 mb-2">Uploading Questions...</h4>
                <p className="text-sm text-gray-600 mb-4">Please wait while we process your questions.</p>
                
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

export default BulkQuestionUpload;