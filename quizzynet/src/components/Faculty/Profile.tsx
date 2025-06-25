import React, { useState } from 'react';
import { User, Mail, Phone, Edit, Save, X, Lock, GraduationCap, Building } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import Sidebar from '../Layout/Sidebar';
import Header from '../Layout/Header';

const FacultyProfile: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: userData?.firstName || '',
    lastName: userData?.lastName || '',
    phone: userData?.phone || '',
    department: userData?.department || '',
    specialization: userData?.specialization || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'faculty', currentUser.uid), {
        ...formData,
        displayName: `${formData.firstName} ${formData.lastName}`,
        updatedAt: new Date()
      });

      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentUser) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(currentUser, passwordData.newPassword);
      toast.success('Password changed successfully!');
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Error changing password');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: userData?.firstName || '',
      lastName: userData?.lastName || '',
      phone: userData?.phone || '',
      department: userData?.department || '',
      specialization: userData?.specialization || ''
    });
    setIsEditing(false);
  };

  const departments = [
    'Computer Science',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'English',
    'History',
    'Economics',
    'Psychology',
    'Philosophy'
  ].sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      
      <div className="ml-64 pt-16">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="mt-2 text-gray-600">Manage your personal information and account settings</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Information */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{userData?.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{userData?.lastName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <p className="text-gray-900">{userData?.email}</p>
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Faculty ID
                    </label>
                    <p className="text-gray-900">{userData?.facultyId}</p>
                    <p className="text-xs text-gray-500 mt-1">Faculty ID cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900">{userData?.phone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    {isEditing ? (
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-gray-900">{userData?.department}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specialization
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Area of specialization"
                      />
                    ) : (
                      <p className="text-gray-900">{userData?.specialization}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Password Change Section */}
              <div className="bg-white rounded-lg shadow-md p-6 mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
                  {!isChangingPassword ? (
                    <button
                      onClick={() => setIsChangingPassword(true)}
                      className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Change Password
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleChangePassword}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Changing...' : 'Change Password'}
                      </button>
                      <button
                        onClick={() => {
                          setIsChangingPassword(false);
                          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        }}
                        className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {isChangingPassword && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter new password"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Summary */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <GraduationCap className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {userData?.firstName} {userData?.lastName}
                  </h3>
                  <p className="text-gray-600">{userData?.facultyId}</p>
                  <p className="text-sm text-gray-500 mt-2">{userData?.email}</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Faculty Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Department</span>
                    <span className="text-sm font-medium text-gray-900">{userData?.department}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Specialization</span>
                    <span className="text-sm font-medium text-gray-900">{userData?.specialization}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <span className={`text-sm font-medium ${
                      userData?.isApproved ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {userData?.isApproved ? 'Approved' : 'Pending Approval'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Member Since</span>
                    <span className="text-sm font-medium text-gray-900">
                      {userData?.createdAt?.toDate ? 
                        new Date(userData.createdAt.toDate()).toLocaleDateString() : 
                        'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyProfile;