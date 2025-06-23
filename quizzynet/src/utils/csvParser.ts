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
    if (file.size > 1024 * 1024 * 1024) { // 1GB limit
      reject(new Error('File size exceeds 1GB limit'));
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: string[] = [];
        const questions: QuizQuestion[] = [];
        
        results.data.forEach((row: any, index: number) => {
          try {
            // Validate required fields
            if (!row.question || row.question.trim() === '') {
              errors.push(`Row ${index + 1}: Question is required`);
              return;
            }

            // Parse options
            const options = [
              row.option1?.trim(),
              row.option2?.trim(),
              row.option3?.trim(),
              row.option4?.trim()
            ].filter(option => option && option !== '');

            if (options.length < 2) {
              errors.push(`Row ${index + 1}: At least 2 options are required`);
              return;
            }

            // Parse correct answer
            const correctAnswer = parseInt(row.correctAnswer) - 1; // Convert to 0-based index
            if (isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer >= options.length) {
              errors.push(`Row ${index + 1}: Invalid correct answer (must be between 1 and ${options.length})`);
              return;
            }

            // Create question object
            const question: QuizQuestion = {
              id: `q_${Date.now()}_${index}`,
              question: row.question.trim(),
              options,
              correctAnswer,
              explanation: row.explanation?.trim() || '',
              difficulty: row.difficulty?.toLowerCase() || 'medium',
              category: row.category?.trim() || 'General'
            };

            questions.push(question);
          } catch (error) {
            errors.push(`Row ${index + 1}: ${error.message}`);
          }
        });

        resolve({
          questions,
          errors,
          totalRows: results.data.length,
          validRows: questions.length
        });
      },
      error: (error) => {
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
      'JavaScript is primarily used for web development.',
      'medium',
      'Programming'
    ]
  ];

  return Papa.unparse(template);
};