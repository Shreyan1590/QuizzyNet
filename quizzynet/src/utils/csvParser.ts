import Papa from 'papaparse';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
}

export interface ParsedQuizData {
  questions: QuizQuestion[];
  errors: string[];
  totalRows: number;
  validRows: number;
}

export const parseCSVFile = (file: File): Promise<ParsedQuizData> => {
  return new Promise((resolve, reject) => {
    console.log('Starting CSV parsing...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      reject(new Error('File size exceeds 10MB limit'));
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      reject(new Error('Invalid file type. Please upload a CSV file.'));
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        console.log('CSV parsing completed:', {
          totalRows: results.data.length,
          errors: results.errors.length,
          meta: results.meta
        });

        const errors: string[] = [];
        const questions: QuizQuestion[] = [];
        
        // Check for Papa Parse errors
        if (results.errors.length > 0) {
          results.errors.forEach(error => {
            errors.push(`Parse error at row ${error.row}: ${error.message}`);
          });
        }

        // Validate required columns
        const requiredColumns = ['question', 'option1', 'option2', 'option3', 'option4', 'correctAnswer'];
        const headers = results.meta.fields || [];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
          errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
          resolve({
            questions: [],
            errors,
            totalRows: results.data.length,
            validRows: 0
          });
          return;
        }

        // Process each row
        results.data.forEach((row: any, index: number) => {
          try {
            const rowNumber = index + 1;
            
            // Validate required fields
            if (!row.question || row.question.trim() === '') {
              errors.push(`Row ${rowNumber}: Question is required`);
              return;
            }

            // Parse and validate options
            const options = [
              row.option1?.trim(),
              row.option2?.trim(),
              row.option3?.trim(),
              row.option4?.trim()
            ].filter(option => option && option !== '');

            if (options.length < 2) {
              errors.push(`Row ${rowNumber}: At least 2 options are required`);
              return;
            }

            // Parse and validate correct answer
            const correctAnswerInput = row.correctAnswer?.toString().trim();
            if (!correctAnswerInput) {
              errors.push(`Row ${rowNumber}: Correct answer is required`);
              return;
            }

            const correctAnswer = parseInt(correctAnswerInput) - 1; // Convert to 0-based index
            if (isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer >= options.length) {
              errors.push(`Row ${rowNumber}: Invalid correct answer (must be between 1 and ${options.length})`);
              return;
            }

            // Validate difficulty level
            const difficulty = row.difficulty?.toLowerCase().trim() || 'medium';
            if (!['easy', 'medium', 'hard'].includes(difficulty)) {
              errors.push(`Row ${rowNumber}: Invalid difficulty level (must be easy, medium, or hard)`);
              return;
            }

            // Create question object
            const question: QuizQuestion = {
              id: `q_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
              question: row.question.trim(),
              options,
              correctAnswer,
              explanation: row.explanation?.trim() || '',
              difficulty: difficulty as 'easy' | 'medium' | 'hard',
              category: row.category?.trim() || 'General'
            };

            questions.push(question);
            console.log(`Processed question ${rowNumber}:`, question);
            
          } catch (error: any) {
            console.error(`Error processing row ${index + 1}:`, error);
            errors.push(`Row ${index + 1}: ${error.message}`);
          }
        });

        console.log('CSV parsing summary:', {
          totalRows: results.data.length,
          validQuestions: questions.length,
          errors: errors.length
        });

        resolve({
          questions,
          errors,
          totalRows: results.data.length,
          validRows: questions.length
        });
      },
      error: (error) => {
        console.error('Papa Parse error:', error);
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
};

export const generateCSVTemplate = (): string => {
  const template = [
    ['question', 'option1', 'option2', 'option3', 'option4', 'correctAnswer', 'explanation', 'difficulty', 'category'],
    [
      'What is the capital of France?',
      'London',
      'Berlin',
      'Paris',
      'Madrid',
      '3',
      'Paris is the capital and largest city of France.',
      'easy',
      'Geography'
    ],
    [
      'Which programming language is known for its use in web development?',
      'Python',
      'JavaScript',
      'C++',
      'Java',
      '2',
      'JavaScript is primarily used for web development and runs in browsers.',
      'medium',
      'Programming'
    ],
    [
      'What is the result of 2 + 2?',
      '3',
      '4',
      '5',
      '6',
      '2',
      'Basic arithmetic: 2 + 2 equals 4.',
      'easy',
      'Mathematics'
    ]
  ];

  return Papa.unparse(template);
};