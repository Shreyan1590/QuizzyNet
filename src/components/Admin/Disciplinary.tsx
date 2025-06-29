import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Plus, Edit, Trash2, User, Calendar } from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';

interface DisciplinaryAction {
  id: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
  type: 'warning' | 'suspension' | 'probation' | 'expulsion';
  reason: string;
  description: string;
  issuedBy: string;
  issuedAt: any;
  status: 'active' | 'resolved' | 'appealed';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  registrationNumber: string;
}

const AdminDisciplinary: React.FC = () => {
  const [actions, setActions] = useState<DisciplinaryAction[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAction, setEditingAction] = useState<DisciplinaryAction | null>(null);
  const [formData, setFormData] = useState({
    studentId: '',
    type: 'warning' as 'warning' | 'suspension' | 'probation' | 'expulsion',
    reason: '',
    description: '',
    severity: 'low' as 'low' | 'medium' | 'high' | 'critical'
  });

  useEffect(() => {
    fetchStudents();
    fetchDisciplinaryActions();
  }, []);

  const fetchStudents = async () => {
    try {
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const studentsData = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      
      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching students:', error);
      // Don't show error toast for permission issues during initial load
      if (error.code !== 'permission-denied') {
        toast.error('Error loading students');
      }
    }
  };

  const fetchDisciplinaryActions = async () => {
    try {
      // Try to set up real-time listener first
      const unsubscribe = onSnapshot(
        query(collection(db, 'disciplinaryActions'), orderBy('issuedAt', 'desc')),
        (snapshot) => {
          const actionsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as DisciplinaryAction[];
          
          setActions(actionsData);
          setLoading(false);
        },
        (error) => {
          console.error('Error in disciplinary actions listener:', error);
          // Fall back to one-time fetch if real-time listener fails
          fetchDisciplinaryActionsOnce();
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up disciplinary actions listener:', error);
      // Fall back to one-time fetch
      fetchDisciplinaryActionsOnce();
    }
  };

  const fetchDisciplinaryActionsOnce = async () => {
    try {
      const actionsSnapshot = await getDocs(
        query(collection(db, 'disciplinaryActions'), orderBy('issuedAt', 'desc'))
      );
      const actionsData = actionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DisciplinaryAction[];
      
      setActions(actionsData);
    } catch (error) {
      console.error('Error fetching disciplinary actions:', error);
      // Don't show error toast for permission issues during initial load
      if (error.code !== 'permission-denied') {
        toast.error('Error loading disciplinary actions');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const selectedStudent = students.find(s => s.id === formData.studentId);
      if (!selectedStudent) {
        toast.error('Please select a student');
        return;
      }

      const actionData = {
        ...formData,
        studentEmail: selectedStudent.email,
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        issuedBy: 'System Administrator',
        issuedAt: new Date(),
        status: 'active' as const
      };

      await addDoc(collection(db, 'disciplinaryActions'), actionData);
      
      // Update student's disciplinary actions array
      await updateDoc(doc(db, 'students', formData.studentId), {
        disciplinaryActions: [...(selectedStudent as any).disciplinaryActions || [], actionData]
      });

      toast.success('Disciplinary action created successfully');
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating disciplinary action:', error);
      toast.error('Error creating disciplinary action');
    }
  };

  const handleUpdateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingAction) return;
    
    try {
      await updateDoc(doc(db, 'disciplinaryActions', editingAction.id), {
        ...formData,
        updatedAt: new Date()
      });
      
      toast.success('Disciplinary action updated successfully');
      setEditingAction(null);
      resetForm();
    } catch (error) {
      console.error('Error updating disciplinary action:', error);
      toast.error('Error updating disciplinary action');
    }
  };

  const handleDeleteAction = async (actionId: string) => {
    if (!confirm('Are you sure you want to delete this disciplinary action?')) return;
    
    try {
      await deleteDoc(doc(db, 'disciplinaryActions', actionId));
      toast.success('Disciplinary action deleted successfully');
    } catch (error) {
      console.error('Error deleting disciplinary action:', error);
      toast.error('Error deleting disciplinary action');
    }
  };

  const resetForm = () => {
    setFormData({
      studentId: '',
      type: 'warning',
      reason: '',
      description: '',
      severity: 'low'
    });
  };

  const openEditModal = (action: DisciplinaryAction) => {
    setEditingAction(action);
    setFormData({
      studentId: action.studentId,
      type: action.type,
      reason: action.reason,
      description: action.description,
      severity: action.severity
    });
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />
        <div className="ml-64 pt-16 flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading disciplinary actions...</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    total: actions.length,
    active: actions.filter(a => a.status === 'active').length,
    resolved: actions.filter(a => a.status === 'resolved').length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Disciplinary Management</h1>
                <p className="mt-2 text-gray-600">Manage student disciplinary actions and violations</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Action
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Actions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-red-100">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Resolved</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions List */}
          <div className="space-y-4">
            {actions.map((action) => (
              <div key={action.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{action.reason}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(action.type)}`}>
                        {action.type.charAt(0).toUpperCase() + action.type.slice(1)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(action.severity)}`}>
                        {action.severity.charAt(0).toUpperCase() + action.severity.slice(1)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        <span>Student: {action.studentName}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>
                          Issued: {action.issuedAt?.toDate ? 
                            new Date(action.issuedAt.toDate()).toLocaleDateString() : 
                            'N/A'
                          }
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 mr-1" />
                        <span>By: {action.issuedBy}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700">{action.description}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => openEditModal(action)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAction(action.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {actions.length === 0 && (
            <div className="text-center py-12">
              <Shield className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No disciplinary actions</h3>
              <p className="mt-2 text-gray-500">
                No disciplinary actions have been recorded yet.
              </p>
            </div>
          )}

          {/* Create/Edit Modal */}
          {(showCreateModal || editingAction) && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {editingAction ? 'Edit Disciplinary Action' : 'Create Disciplinary Action'}
                  </h3>
                  
                  <form onSubmit={editingAction ? handleUpdateAction : handleCreateAction} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Student
                      </label>
                      <select
                        value={formData.studentId}
                        onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                        disabled={!!editingAction}
                      >
                        <option value="">Select Student</option>
                        {students.map(student => (
                          <option key={student.id} value={student.id}>
                            {student.firstName} {student.lastName} ({student.registrationNumber})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Action Type
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      >
                        <option value="warning">Warning</option>
                        <option value="suspension">Suspension</option>
                        <option value="probation">Probation</option>
                        <option value="expulsion">Expulsion</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Severity
                      </label>
                      <select
                        value={formData.severity}
                        onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason
                      </label>
                      <input
                        type="text"
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Brief reason for action"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={4}
                        placeholder="Detailed description of the violation and action taken"
                        required
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateModal(false);
                          setEditingAction(null);
                          resetForm();
                        }}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        {editingAction ? 'Update Action' : 'Create Action'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDisciplinary;