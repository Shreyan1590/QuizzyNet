import { ShieldOff, AlertTriangle, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function BlockedPage() {
    const navigate = useNavigate();
    const [showContact, setShowContact] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleContact = async () => {
        setLoading(true);
        // Simulate sending email
        await new Promise((r) => setTimeout(r, 1500));
        setEmailSent(true);
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-100">
            <div className="text-center p-10 bg-white rounded-2xl shadow-2xl max-w-lg border border-red-100 animate-fade-in">
                <div className="flex justify-center items-center space-x-2">
                    <ShieldOff className="h-14 w-14 text-red-500 animate-pulse" />
                    <AlertTriangle className="h-8 w-8 text-yellow-400 animate-bounce" />
                </div>
                <h1 className="mt-6 text-3xl font-extrabold text-gray-900 tracking-tight">
                    Account Restricted
                </h1>
                <p className="mt-3 text-lg text-gray-700">
                    Your account has been <span className="font-semibold text-red-600">temporarily suspended</span> by the administrator.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="px-5 py-2 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-900 rounded-lg font-medium shadow hover:from-gray-300 hover:to-gray-400 transition"
                    >
                        Return to Home
                    </button>
                    <button
                        onClick={() => setShowContact(true)}
                        className="px-5 py-2 bg-gradient-to-r from-red-400 to-red-600 text-white rounded-lg font-medium shadow hover:from-red-500 hover:to-red-700 transition flex items-center justify-center gap-2"
                        disabled={showContact}
                    >
                        <Mail className="w-5 h-5" />
                        Contact Support
                    </button>
                </div>
                {showContact && (
                    <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4 animate-fade-in">
                        {!emailSent ? (
                            <>
                                <p className="text-gray-700 mb-2">
                                    Need help? Click below to send a request to our support team.
                                </p>
                                <button
                                    onClick={handleContact}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60"
                                    disabled={loading}
                                >
                                    {loading ? 'Sending...' : 'Send Support Request'}
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center">
                                <span className="text-green-600 font-bold mb-1">Request Sent!</span>
                                <span className="text-gray-600 text-sm">Our team will contact you soon.</span>
                            </div>
                        )}
                    </div>
                )}
                <div className="mt-8 text-xs text-gray-400">
                    <span>
                        If you believe this is a mistake, please contact your administrator.
                    </span>
                </div>
            </div>
            <style>
                {`
                    .animate-fade-in {
                        animation: fadeIn 0.7s ease;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(20px);}
                        to { opacity: 1; transform: translateY(0);}
                    }
                `}
            </style>
        </div>
    );
}