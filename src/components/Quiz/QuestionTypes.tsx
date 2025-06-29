import React from 'react';
import { CheckCircle, Circle, Square, CheckSquare, Edit3 } from 'lucide-react';

export interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  timeLimit?: number;
}

interface QuestionTypesProps {
  question: Question;
  selectedAnswer?: string | number;
  onAnswerSelect?: (answer: string | number) => void;
  showCorrectAnswer?: boolean;
  isReview?: boolean;
  disabled?: boolean;
}

const QuestionTypes: React.FC<QuestionTypesProps> = ({
  question,
  selectedAnswer,
  onAnswerSelect,
  showCorrectAnswer = false,
  isReview = false,
  disabled = false
}) => {
  const renderMultipleChoice = () => (
    <div className="space-y-3">
      {question.options?.map((option, index) => {
        const isSelected = selectedAnswer === index;
        const isCorrect = question.correctAnswer === index;
        const showAsCorrect = showCorrectAnswer && isCorrect;
        const showAsIncorrect = showCorrectAnswer && isSelected && !isCorrect;

        return (
          <label
            key={index}
            className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
              disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-gray-300'
            } ${
              showAsCorrect
                ? 'border-green-500 bg-green-50'
                : showAsIncorrect
                ? 'border-red-500 bg-red-50'
                : isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200'
            }`}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={index}
              checked={isSelected}
              onChange={() => !disabled && onAnswerSelect?.(index)}
              disabled={disabled}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
              showAsCorrect
                ? 'border-green-500 bg-green-500'
                : showAsIncorrect
                ? 'border-red-500 bg-red-500'
                : isSelected
                ? 'border-blue-500 bg-blue-500'
                : 'border-gray-300'
            }`}>
              {(isSelected || showAsCorrect) && (
                <div className={`w-2 h-2 rounded-full ${
                  showAsCorrect || showAsIncorrect ? 'bg-white' : 'bg-white'
                }`} />
              )}
            </div>
            <span className={`text-lg ${
              showAsCorrect ? 'text-green-800' : showAsIncorrect ? 'text-red-800' : 'text-gray-900'
            }`}>
              {option}
            </span>
            {showCorrectAnswer && isCorrect && (
              <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
            )}
          </label>
        );
      })}
    </div>
  );

  const renderTrueFalse = () => (
    <div className="space-y-3">
      {['True', 'False'].map((option, index) => {
        const isSelected = selectedAnswer === index;
        const isCorrect = question.correctAnswer === index;
        const showAsCorrect = showCorrectAnswer && isCorrect;
        const showAsIncorrect = showCorrectAnswer && isSelected && !isCorrect;

        return (
          <label
            key={index}
            className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
              disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-gray-300'
            } ${
              showAsCorrect
                ? 'border-green-500 bg-green-50'
                : showAsIncorrect
                ? 'border-red-500 bg-red-50'
                : isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200'
            }`}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={index}
              checked={isSelected}
              onChange={() => !disabled && onAnswerSelect?.(index)}
              disabled={disabled}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
              showAsCorrect
                ? 'border-green-500 bg-green-500'
                : showAsIncorrect
                ? 'border-red-500 bg-red-500'
                : isSelected
                ? 'border-blue-500 bg-blue-500'
                : 'border-gray-300'
            }`}>
              {(isSelected || showAsCorrect) && (
                <div className="w-2 h-2 bg-white rounded-full" />
              )}
            </div>
            <span className={`text-lg font-medium ${
              showAsCorrect ? 'text-green-800' : showAsIncorrect ? 'text-red-800' : 'text-gray-900'
            }`}>
              {option}
            </span>
            {showCorrectAnswer && isCorrect && (
              <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
            )}
          </label>
        );
      })}
    </div>
  );

  const renderShortAnswer = () => (
    <div className="space-y-3">
      <textarea
        value={selectedAnswer as string || ''}
        onChange={(e) => !disabled && onAnswerSelect?.(e.target.value)}
        disabled={disabled}
        placeholder="Type your answer here..."
        className={`w-full p-4 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300'
        } ${
          showCorrectAnswer && selectedAnswer
            ? selectedAnswer === question.correctAnswer
              ? 'border-green-500 bg-green-50'
              : 'border-red-500 bg-red-50'
            : ''
        }`}
        rows={4}
      />
      {showCorrectAnswer && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-1">Correct Answer:</p>
          <p className="text-blue-800">{question.correctAnswer}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <h3 className="text-xl font-semibold text-gray-900 leading-relaxed">
          {question.question}
        </h3>
        <div className="flex items-center space-x-2 ml-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {question.difficulty}
          </span>
          <span className="text-sm text-gray-500">{question.points} pts</span>
        </div>
      </div>

      <div className="mt-6">
        {question.type === 'multiple-choice' && renderMultipleChoice()}
        {question.type === 'true-false' && renderTrueFalse()}
        {question.type === 'short-answer' && renderShortAnswer()}
      </div>

      {showCorrectAnswer && question.explanation && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Explanation:</h4>
          <p className="text-blue-800">{question.explanation}</p>
        </div>
      )}
    </div>
  );
};

export default QuestionTypes;