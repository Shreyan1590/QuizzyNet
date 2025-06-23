import React, { useState } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { parseCSVFile, generateCSVTemplate, QuizQuestion } from '../../utils/csvParser';
import { toast } from 'react-hot-toast';
import { collection, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

const QuizUpload: React.FC = () => {
  const { currentUser } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedData, setParsedData] = useState<{
    questions: QuizQuestion[];
    errors: string[];
    totalRows: number;
    validRows: number;
  } | null>(null);

  // Handle drag and drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
  };

  // Process uploaded file
  const handleFileUpload = async (uploadedFile: File) => {
    if (!uploadedFile.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setFile(uploadedFile);
    setParsing(true);
    setParsedData(null);

    try {
      const result = await parseCSVFile(uploadedFile);
      setParsedData(result);
      
      if (result.errors.length > 0) {
        toast.error(`Parsed with ${result.errors.length} errors`);
      } else {
        toast.success(`Successfully parsed ${result.validRows} questions`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to parse CSV file');
    } finally {
      setParsing(false);
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded successfully');
  };

  // Save questions to Firestore
  const handleSaveQuestions = async () => {
    if (!parsedData || parsedData.questions.length === 0) {
      toast.error('No valid questions to save');
      return;
    }

    if (!currentUser) {
      toast.error('You must be logged in to save questions');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const batch = writeBatch(db);
      const questionsCollection = collection(db, 'quizzes');
      const totalQuestions = parsedData.questions.length;

      // Prepare all questions for batch write
      parsedData.questions.forEach((question, index) => {
        const docRef = doc(questionsCollection);
        batch.set(docRef, {
          ...question,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: currentUser.uid,
          status: 'pending_review',
          category: question.category || 'general'
        });
        
        // Update progress every 10 questions
        if (index % 10 === 0) {
          setUploadProgress(Math.round((index / totalQuestions) * 100));
        }
      });

      // Commit the batch
      await batch.commit();
      setUploadProgress(100);
      
      toast.success(`Successfully saved ${totalQuestions} questions!`);
      
      // Reset form
      setFile(null);
      setParsedData(null);
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(`Failed to save questions: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Validate questions before saving
  const validateQuestions = (questions: QuizQuestion[]) => {
    return questions.filter(q => 
      q.question?.trim() && 
      q.options?.length >= 2 && 
      q.correctAnswer >= 0 && 
      q.correctAnswer < q.options.length
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Quiz Questions</h1>
        <p className="mt-2 text-gray-600">Upload questions via CSV file</p>
      </div>

      {/* Template Download */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">Need a template?</h3>
            <p className="text-blue-700">Download our CSV template to get started</p>
          </div>
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={parsing || uploading}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </button>
        </div>
      </div>

      {/* File Upload Area */}
      <div className="mb-8">
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          } ${(parsing || uploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={parsing || uploading}
          />
          
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-gray-600" />
              )}
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-900">
                {uploading ? 'Uploading questions...' : 'Drop your CSV file here, or click to browse'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {uploading ? `${uploadProgress}% complete` : 'Supports .csv files only'}
              </p>
            </div>
          </div>
          
          {parsing && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="animate-spin rounded-full h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Parsing file...</p>
              </div>
            </div>
          )}
        </div>

        {file && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Parse Results */}
      {parsedData && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Parse Results</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{parsedData.totalRows}</p>
                <p className="text-sm text-blue-700">Total Rows</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{parsedData.validRows}</p>
                <p className="text-sm text-green-700">Valid Questions</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{parsedData.errors.length}</p>
                <p className="text-sm text-red-700">Errors</p>
              </div>
            </div>

            {parsedData.validRows > 0 && (
              <button
                onClick={handleSaveQuestions}
                disabled={uploading}
                className={`w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center ${
                  uploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Saving... {uploadProgress}%
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Save {parsedData.validRows} Questions
                  </>
                )}
              </button>
            )}
          </div>

          {/* Errors */}
          {parsedData.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="text-lg font-semibold text-red-900">Parsing Errors</h3>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {parsedData.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700 bg-red-100 p-2 rounded">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Questions */}
          {parsedData.questions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Preview</h3>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {parsedData.questions.slice(0, 5).map((question, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {question.difficulty || 'medium'}
                      </span>
                    </div>
                    
                    <p className="text-gray-700 mb-3">{question.question}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {question.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className={`p-2 rounded text-sm ${
                            optionIndex === question.correctAnswer
                              ? 'bg-green-100 text-green-800 font-medium'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {String.fromCharCode(65 + optionIndex)}. {option}
                        </div>
                      ))}
                    </div>
                    
                    {question.explanation && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        Explanation: {question.explanation}
                      </p>
                    )}
                  </div>
                ))}
                
                {parsedData.questions.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... and {parsedData.questions.length - 5} more questions
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizUpload;