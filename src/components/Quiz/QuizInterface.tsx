import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { endProctoring } from "../../lib/proctoring";
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { doc, getDoc, collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import SecurityManager from "../../lib/security";
import { toast } from "react-hot-toast";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  difficulty?: string;
  category?: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  duration: number;
  questionsCount: number;
  isActive: boolean;
}

const QuizInterface: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [securityManager, setSecurityManager] =
    useState<SecurityManager | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quizStarted, setQuizStarted] = useState(false);

  useEffect(() => {
    if (quizId) {
      fetchQuizData();
    }
  }, [quizId]);

  useEffect(() => {
    if (quizStarted && quiz) {
      // Initialize security manager
      const security = new SecurityManager(handleSecurityViolation);
      setSecurityManager(security);

      // Check if user is locked
      if (security.isUserLocked()) {
        handleSecurityViolation();
        return;
      }

      // Start timer
      setTimeRemaining(quiz.duration * 60); // Convert to seconds
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timer);
        security.destroy();
      };
    }
  }, [quizStarted, quiz]);

  const fetchQuizData = async () => {
    if (!quizId || !currentUser) return;

    try {
      console.log("Fetching quiz data for ID:", quizId);

      // Fetch quiz details
      const quizDoc = await getDoc(doc(db, "quizzes", quizId));
      if (!quizDoc.exists()) {
        toast.error("Quiz not found");
        navigate("/dashboard");
        return;
      }

      const quizData = { id: quizDoc.id, ...quizDoc.data() } as Quiz;
      console.log("Quiz data:", quizData);

      if (!quizData.isActive) {
        toast.error("This quiz is not currently active");
        navigate("/dashboard");
        return;
      }

      setQuiz(quizData);

      // Fetch questions from the correct subcollection
      const questionsSnapshot = await getDocs(
        collection(db, "quizzes", quizId, "questions")
      );
      const quizQuestions = questionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Question[];

      console.log("Quiz questions:", quizQuestions.length);

      if (quizQuestions.length === 0) {
        toast.error("No questions found for this quiz");
        navigate("/dashboard");
        return;
      }

      setQuestions(quizQuestions);
    } catch (error) {
      console.error("Error fetching quiz data:", error);
      toast.error("Error loading quiz");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityViolation = () => {
    toast.error(
      "Security violation detected. Quiz access has been restricted."
    );
    navigate("/dashboard");
  };

  const [sessionId, setSessionId] = useState("");
  const startQuiz = () => {
    const newSessionId = `session-${Date.now()}`;
    setSessionId(newSessionId);
    if (questions.length === 0) {
      toast.error("No questions available for this quiz");
      return;
    }
    setQuizStarted(true);
    toast.success("Quiz started! Good luck!");
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerSelect = (optionIndex: number) => {
    setAnswers({
      ...answers,
      [questions[currentQuestionIndex].id]: optionIndex,
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      console.log("Submitting quiz...", {
        answers,
        questions: questions.length,
      });

      // 1. First stop all proctoring
      // 1. First stop proctoring using your existing function
      const terminationResult = await endProctoring(
        currentUser?.uid || "",
        quiz?.id || "",
        sessionId // Make sure you have this state variable
      );

      if (!terminationResult.success) {
        console.warn(
          "Proctoring termination had issues:",
          terminationResult.errors
        );
        toast.warning(
          "Proctoring stopped with some issues - results still saved"
        );
      }

      // 2. Calculate results
      let correctAnswers = 0;
      const detailedResults = questions.map((question) => {
        const userAnswer = answers[question.id];
        const isCorrect = userAnswer === question.correctAnswer;
        if (isCorrect) correctAnswers++;

        return {
          questionId: question.id,
          question: question.question,
          options: question.options,
          userAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect,
          explanation: question.explanation,
        };
      });

      const score = Math.round((correctAnswers / questions.length) * 100);

      // 3. Save results to database
      const results = {
        quizId: quiz?.id,
        quizTitle: quiz?.title,
        studentId: currentUser?.uid,
        studentEmail: currentUser?.email,
        totalQuestions: questions.length,
        correctAnswers,
        score,
        timeSpent: quiz ? quiz.duration * 60 - timeRemaining : 0,
        completedAt: new Date(),
        detailedResults,
        status: "completed",
        proctoringSummary: terminationResult.summary, // Include proctoring data
        proctoringStatus: terminationResult.success ? "complete" : "partial",
      };

      const resultDoc = await addDoc(collection(db, "quizResults"), results);

      // 4. Navigate to results
      toast.success("Quiz submitted successfully!");
      navigate(`/results/${resultDoc.id}`);
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error("Error submitting quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
    try {
      localStorage.setItem(
        `quiz-backup-${Date.now()}`,
        JSON.stringify({ answers, questions })
      );
    } catch (e) {
      console.error("Failed to save backup:", e);
    }

    toast.error("Error submitting quiz. A backup was saved locally.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Quiz not available
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            This quiz is not currently available or has no questions.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {quiz.title}
            </h1>
            <p className="text-gray-600 mb-6">{quiz.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-blue-900">Duration</p>
                <p className="text-lg font-bold text-blue-700">
                  {quiz.duration} minutes
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-900">Questions</p>
                <p className="text-lg font-bold text-green-700">
                  {questions.length}
                </p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-yellow-900">Security</p>
                <p className="text-lg font-bold text-yellow-700">Monitored</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Important Instructions
              </h3>
              <ul className="text-sm text-red-800 text-left space-y-1">
                <li>• Do not switch tabs or leave the quiz window</li>
                <li>• Do not right-click or use browser developer tools</li>
                <li>• Stay in full-screen mode throughout the quiz</li>
                <li>
                  • You have maximum 3 security violations before being locked
                  out
                </li>
                <li>• Quiz will auto-submit when time expires</li>
              </ul>
            </div>

            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={startQuiz}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredQuestions = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-lg sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{quiz.title}</h1>
              <p className="text-sm text-gray-500">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">
                  {answeredQuestions}/{questions.length} answered
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-red-500" />
                <span
                  className={`text-lg font-mono font-bold ${
                    timeRemaining < 300 ? "text-red-600" : "text-gray-900"
                  }`}
                >
                  {formatTime(timeRemaining)}
                </span>
              </div>

              {securityManager && (
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-medium">
                    {securityManager.getRemainingAttempts()} attempts left
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {currentQuestion.question}
            </h2>

            <div className="space-y-4">
              {currentQuestion.options.map((option, index) => (
                <label
                  key={index}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    answers[currentQuestion.id] === index
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={index}
                    checked={answers[currentQuestion.id] === index}
                    onChange={() => handleAnswerSelect(index)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                      answers[currentQuestion.id] === index
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300"
                    }`}
                  >
                    {answers[currentQuestion.id] === index && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <span className="text-lg text-gray-900">{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                currentQuestionIndex === 0
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Previous
            </button>

            <div className="flex space-x-4">
              {currentQuestionIndex === questions.length - 1 ? (
                <button
                  onClick={handleSubmitQuiz}
                  disabled={isSubmitting}
                  className={`px-8 py-3 rounded-lg font-medium text-white transition-colors ${
                    isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isSubmitting ? "Submitting..." : "Submit Quiz"}
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question Navigation */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Question Navigation
          </h3>
          <div className="grid grid-cols-10 gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                  index === currentQuestionIndex
                    ? "bg-blue-600 text-white"
                    : answers[questions[index].id] !== undefined
                    ? "bg-green-100 text-green-700 border-2 border-green-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizInterface;
