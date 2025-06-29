import React, { useState } from 'react';
import { Upload, Download, FileText, CheckCircle, AlertTriangle, X, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';

interface CourseData {
  courseCode: string;
  courseName: string;
  subjectCategory: string;
  courseCategory: string;
  description: string;
  credits: number;
  prerequisites: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

const BulkCourseUpload: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentUser, userData } = useAuth();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CourseData[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'processing'>('upload');
  const [uploadProgress, setUploadProgress] = useState(0);

  const downloadTemplate = () => {
    const template = [
      ['courseCode', 'courseName', 'subjectCategory', 'courseCategory', 'description', 'credits', 'prerequisites'],
      ['CSA101', 'Introduction to Programming', 'Computer Science', 'Core', 'Basic programming concepts and problem solving', '3', 'None'],
      ['CSA102', 'Data Structures', 'Computer Science', 'Core', 'Fundamental data structures and algorithms', '4', 'CSA101'],
      ['CSA201', 'Web Development', 'Computer Science', 'Elective', 'Modern web development technologies', '3', 'CSA101']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'course_upload_template.csv';
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
      const expectedHeaders = ['courseCode', 'courseName', 'subjectCategory', 'courseCategory', 'description', 'credits', 'prerequisites'];
      
      // Validate headers
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
        return;
      }

      const data: CourseData[] = [];
      const errors: ValidationError[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Validate required fields
        if (!row.courseCode) {
          errors.push({ row: i + 1, field: 'courseCode', message: 'Course code is required' });
        }
        if (!row.courseName) {
          errors.push({ row: i + 1, field: 'courseName', message: 'Course name is required' });
        }
        if (!row.subjectCategory) {
          errors.push({ row: i + 1, field: 'subjectCategory', message: 'Subject category is required' });
        }
        if (!row.courseCategory) {
          errors.push({ row: i + 1, field: 'courseCategory', message: 'Course category is required' });
        }

        // Validate credits
        const credits = parseInt(row.credits);
        if (isNaN(credits) || credits < 1 || credits > 6) {
          errors.push({ row: i + 1, field: 'credits', message: 'Credits must be a number between 1 and 6' });
        } else {
          row.credits = credits;
        }

        data.push(row as CourseData);
      }

      setCsvData(data);
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

    setUploading(true);
    setStep('processing');
    setUploadProgress(0);

    try {
      const totalCourses = csvData.length;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < csvData.length; i++) {
        const course = csvData[i];
        
        try {
          await addDoc(collection(db, 'courses'), {
            ...course,
            facultyId: currentUser?.uid,
            facultyName: `${userData?.firstName} ${userData?.lastName}`,
            isApproved: false,
            createdAt: new Date(),
            enrolledStudents: 0
          });
          
          successCount++;
        } catch (error) {
          console.error(`Error uploading course ${course.courseCode}:`, error);
          errorCount++;
        }

        setUploadProgress(Math.round(((i + 1) / totalCourses) * 100));
        
        // Add small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} courses`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to upload ${errorCount} courses`);
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
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Bulk Course Upload</h3>
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
                  Download the template first, fill in your course data, then upload the completed CSV file.
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
                  <li>• Required columns: courseCode, courseName, subjectCategory, courseCategory, description, credits, prerequisites</li>
                  <li>• Course codes must be unique</li>
                  <li>• Credits must be a number between 1 and 6</li>
                  <li>• Use "None" for courses with no prerequisites</li>
                  <li>• All courses will require admin approval after upload</li>
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
                    {csvData.length} courses found
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

              <div className="overflow-x-auto max-h-64 border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Course Code</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Course Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prerequisites</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {csvData.slice(0, 10).map((course, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{course.courseCode}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{course.courseName}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{course.courseCategory}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{course.credits}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{course.prerequisites || 'None'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {csvData.length > 10 && (
                <p className="text-sm text-gray-500 text-center">
                  Showing first 10 courses. {csvData.length - 10} more courses will be uploaded.
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
                  disabled={validationErrors.length > 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload {csvData.length} Courses
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
                <h4 className="text-lg font-medium text-gray-900 mb-2">Uploading Courses...</h4>
                <p className="text-sm text-gray-600 mb-4">Please wait while we process your courses.</p>
                
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

export default BulkCourseUpload;