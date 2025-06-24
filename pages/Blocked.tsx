import { ShieldOff } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BlockedPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear blocked status after showing message
    sessionStorage.removeItem('blocked_user');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
        <ShieldOff className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Account Restricted</h1>
        <p className="mt-2 text-gray-600">
          Your account has been temporarily suspended by the administrator.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Please contact support at support@quizmaster.com for assistance.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}