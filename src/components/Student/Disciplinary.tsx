import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase'
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';

interface DisciplinaryAction {
  id: string;
  type: 'warning' | 'suspension' | 'probation' | 'expulsion';
  reason: string;
  description: string;
  issuedBy: string;
  issuedAt: any;
  status: 'active' | 'resolved' | 'appealed';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const StudentDisciplinary: React.FC = () => {
  const { userData } = useAuth();
  const [disciplinaryActions, setDisciplinaryActions] = useState<DisciplinaryAction[]>([]);

  useEffect(() => {
    if (userData?.disciplinaryActions) {
      setDisciplinaryActions(userData.disciplinaryActions);
    }
  }, [userData]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'suspension': return 'bg-orange-100 text-orange-800';
      case 'probation': return 'bg-red-100 text-red-800';
      case 'expulsion': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'resolved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'appealed': return <Clock className="w-5 h-5 text-yellow-500" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Disciplinary Records</h1>
            <p className="mt-2 text-gray-600">View your disciplinary actions and status</p>
          </div>

          {disciplinaryActions.length > 0 ? (
            <div className="space-y-6">
              {disciplinaryActions.map((action) => (
                <div key={action.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(action.status)}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{action.reason}</h3>
                        <p className="text-sm text-gray-500">
                          Issued by: {action.issuedBy} • {action.issuedAt?.toDate ? 
                            new Date(action.issuedAt.toDate()).toLocaleDateString() : 
                            'N/A'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(action.type)}`}>
                        {action.type.charAt(0).toUpperCase() + action.type.slice(1)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(action.severity)}`}>
                        {action.severity.charAt(0).toUpperCase() + action.severity.slice(1)}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4">{action.description}</p>

                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      action.status === 'active' ? 'bg-red-100 text-red-800' :
                      action.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      Status: {action.status.charAt(0).toUpperCase() + action.status.slice(1)}
                    </span>
                    
                    {action.status === 'active' && (
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Appeal Action
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Shield className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Disciplinary Action</h3>
              <p className="text-gray-600">
                You have a clean disciplinary record. Keep up the good work!
              </p>
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Good Standing:</strong> Your account is in good standing with no active disciplinary actions.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDisciplinary;