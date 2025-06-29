import React, { useState } from 'react';
import { Plus, Trash2, Save, Eye, Clock, Users, FileText, Settings } from 'lucide-react';
import { Question } from './QuestionTypes';
import QuestionTypes from './QuestionTypes';
import { toast } from 'react-hot-toast';

interface QuizData {
  title: string;
  description: string;
  timeLimit: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showResults: boolean;
  allowReview: boolean;
  questions: Question[];
}

interface QuizCreatorProps {
  onSave: (quiz: QuizData) => void;
  onCancel: () => void;
  initialData?: Partial<QuizData>;
}

const QuizCreator: React.FC<QuizCreatorProps> = ({ onSave, onCancel, initialData }) => {
  const [quiz, setQuiz] = useState<QuizData>({
    title: '',
    description: '',
    timeLimit: 60,
    maxAttempts: 1,
    shuffleQuestions: false,
    showResults: true,
    allowReview: true,
    questions: [],
    ...initialData
  });

  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    type: 'multiple-choice',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    points: 1,
    difficulty: 'medium',
    category: '',
    timeLimit: 0
  });

  const [showPreview, setShowPreview] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addQuestion = () => {
    if (!currentQuestion.question?.trim()) {
      toast.error('Please enter a question');
      return;
    }

    if (currentQuestion.type === 'multiple-choice' && 
        (!currentQuestion.options || currentQuestion.options.some(opt => !opt.trim()))) {
      toast.error('Please fill in all answer options');
      return;
    }

    if (currentQuestion.type === 'short-answer' && !currentQuestion.correctAnswer) {
      toast.error('Please provide the correct answer');
      return;
    }

    const newQuestion: Question = {
      id: Date.now().toString(),
      type: currentQuestion.type as Question['type'],
      question: currentQuestion.question,
      options: currentQuestion.type === 'short-answer' ? undefined : currentQuestion.options,
      correctAnswer: currentQuestion.correctAnswer!,
      explanation: currentQuestion.explanation,
      points: currentQuestion.points || 1,
      difficulty: currentQuestion.difficulty as Question['difficulty'],
      category: currentQuestion.category,
      timeLimit: currentQuestion.timeLimit
    };

    if (editingIndex !== null) {
      const updatedQuestions = [...quiz.questions];
      updatedQuestions[editingIndex] = newQuestion;
      setQuiz({ ...quiz, questions: updatedQuestions });
      setEditingIndex(null);
      toast.success('Question updated successfully');
    } else {
      setQuiz({ ...quiz, questions: [...quiz.questions, newQuestion] });
      toast.success('Question added successfully');
    }

    // Reset form
    setCurrentQuestion({
      type: 'multiple-choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      points: 1,
      difficulty: 'medium',
      category: '',
      timeLimit: 0
    });
  };

  const editQuestion = (index: number) => {
    const question = quiz.questions[index];
    setCurrentQuestion({
      type: question.type,
      question: question.question,
      options: question.options || ['', '', '', ''],
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      points: question.points,
      difficulty: question.difficulty,
      category: question.category,
      timeLimit: question.timeLimit
    });
    setEditingIndex(index);
  };

  const deleteQuestion = (index: number) => {
    const updatedQuestions = quiz.questions.filter((_, i) => i !== index);
    setQuiz({ ...quiz, questions: updatedQuestions });
    toast.success('Question deleted');
  };

  const handleSave = () => {
    if (!quiz.title.trim()) {
      toast.error('Please enter a quiz title');
      return;
    }

    if (quiz.questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    onSave(quiz);
  };

  const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Quiz Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quiz Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quiz Title *
            </label>
            <input
              type="text"
              value={quiz.title}
              onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter quiz title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Limit (minutes)
            </label>
            <input
              type="number"
              value={quiz.timeLimit}
              onChange={(e) => setQuiz({ ...quiz, timeLimit: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={quiz.description}
              onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Enter quiz description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Attempts
            </label>
            <select
              value={quiz.maxAttempts}
              onChange={(e) => setQuiz({ ...quiz, maxAttempts: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={1}>1 Attempt</option>
              <option value={2}>2 Attempts</option>
              <option value={3}>3 Attempts</option>
              <option value={-1}>Unlimited</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={quiz.shuffleQuestions}
                onChange={(e) => setQuiz({ ...quiz, shuffleQuestions: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Shuffle Questions</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={quiz.showResults}
                onChange={(e) => setQuiz({ ...quiz, showResults: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Show Results Immediately</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={quiz.allowReview}
                onChange={(e) => setQuiz({ ...quiz, allowReview: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Allow Review After Completion</span>
            </label>
          </div>
        </div>
      </div>

      {/* Question Creator */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          {editingIndex !== null ? 'Edit Question' : 'Add Question'}
        </h3>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Type
              </label>
              <select
                value={currentQuestion.type}
                onChange={(e) => setCurrentQuestion({ 
                  ...currentQuestion, 
                  type: e.target.value as Question['type'],
                  options: e.target.value === 'short-answer' ? undefined : ['', '', '', ''],
                  correctAnswer: e.target.value === 'short-answer' ? '' : 0
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="multiple-choice">Multiple Choice</option>
                <option value="true-false">True/False</option>
                <option value="short-answer">Short Answer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                value={currentQuestion.difficulty}
                onChange={(e) => setCurrentQuestion({ 
                  ...currentQuestion, 
                  difficulty: e.target.value as Question['difficulty']
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Points
              </label>
              <input
                type="number"
                value={currentQuestion.points}
                onChange={(e) => setCurrentQuestion({ 
                  ...currentQuestion, 
                  points: parseInt(e.target.value) || 1
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question *
            </label>
            <textarea
              value={currentQuestion.question}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Enter your question here..."
            />
          </div>

          {currentQuestion.type === 'multiple-choice' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Answer Options *
              </label>
              <div className="space-y-3">
                {currentQuestion.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="correct-answer"
                      checked={currentQuestion.correctAnswer === index}
                      onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: index })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(currentQuestion.options || [])];
                        newOptions[index] = e.target.value;
                        setCurrentQuestion({ ...currentQuestion, options: newOptions });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Option ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Select the radio button next to the correct answer</p>
            </div>
          )}

          {currentQuestion.type === 'true-false' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correct Answer *
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="true-false-answer"
                    checked={currentQuestion.correctAnswer === 0}
                    onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: 0 })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2">True</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="true-false-answer"
                    checked={currentQuestion.correctAnswer === 1}
                    onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: 1 })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2">False</span>
                </label>
              </div>
            </div>
          )}

          {currentQuestion.type === 'short-answer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correct Answer *
              </label>
              <input
                type="text"
                value={currentQuestion.correctAnswer as string}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter the correct answer"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Explanation (Optional)
            </label>
            <textarea
              value={currentQuestion.explanation}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="Explain why this is the correct answer..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            {editingIndex !== null && (
              <button
                onClick={() => {
                  setEditingIndex(null);
                  setCurrentQuestion({
                    type: 'multiple-choice',
                    question: '',
                    options: ['', '', '', ''],
                    correctAnswer: 0,
                    explanation: '',
                    points: 1,
                    difficulty: 'medium',
                    category: '',
                    timeLimit: 0
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel Edit
              </button>
            )}
            <button
              onClick={addQuestion}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              {editingIndex !== null ? 'Update Question' : 'Add Question'}
            </button>
          </div>
        </div>
      </div>

      {/* Questions List */}
      {quiz.questions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Questions ({quiz.questions.length}) - Total Points: {totalPoints}
            </h3>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Hide Preview' : 'Preview Quiz'}
            </button>
          </div>

          {showPreview ? (
            <div className="space-y-8">
              {quiz.questions.map((question, index) => (
                <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">Question {index + 1}</h4>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => editQuestion(index)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteQuestion(index)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <QuestionTypes question={question} isReview={true} disabled={true} />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {quiz.questions.map((question, index) => (
                <div key={question.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {index + 1}. {question.question.substring(0, 100)}
                      {question.question.length > 100 ? '...' : ''}
                    </h4>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span className="capitalize">{question.type.replace('-', ' ')}</span>
                      <span className="capitalize">{question.difficulty}</span>
                      <span>{question.points} points</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => editQuestion(index)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteQuestion(index)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={onCancel}
          className="px-6 py-3 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Save className="w-5 h-5 mr-2" />
          Save Quiz
        </button>
      </div>
    </div>
  );
};

export default QuizCreator;