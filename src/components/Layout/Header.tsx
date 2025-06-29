import React, { useState } from 'react';
import { LogOut, Bell, Search, Settings, User, ChevronDown, Mail, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Header: React.FC = () => {
  const { currentUser, userRole, userData, logout } = useAuth();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getRoleColor = () => {
    switch (userRole) {
      case 'student': return 'blue';
      case 'faculty': return 'green';
      case 'admin': return 'purple';
      default: return 'gray';
    }
  };

  const getRoleDisplayName = () => {
    switch (userRole) {
      case 'student': return 'Student';
      case 'faculty': return 'Faculty Member';
      case 'admin': return 'System Administrator';
      default: return 'User';
    }
  };

  const getNotifications = () => {
    // Mock notifications based on role
    switch (userRole) {
      case 'student':
        return [
          { id: 1, title: 'New Quiz Available', message: 'Data Structures Quiz is now available', time: '5 min ago', type: 'quiz' },
          { id: 2, title: 'Assignment Due', message: 'Web Development assignment due tomorrow', time: '1 hour ago', type: 'assignment' },
          { id: 3, title: 'Grade Posted', message: 'Your Database Systems quiz grade is available', time: '2 hours ago', type: 'grade' }
        ];
      case 'faculty':
        return [
          { id: 1, title: 'Course Approval', message: 'Your new course has been approved', time: '30 min ago', type: 'approval' },
          { id: 2, title: 'Student Query', message: '3 students have questions about the latest quiz', time: '1 hour ago', type: 'query' },
          { id: 3, title: 'System Update', message: 'New analytics features are now available', time: '3 hours ago', type: 'system' }
        ];
      case 'admin':
        return [
          { id: 1, title: 'Security Alert', message: 'Unusual login activity detected', time: '15 min ago', type: 'security' },
          { id: 2, title: 'Course Pending', message: '5 courses awaiting approval', time: '45 min ago', type: 'pending' },
          { id: 3, title: 'System Health', message: 'All systems operating normally', time: '2 hours ago', type: 'system' }
        ];
      default:
        return [];
    }
  };

  const color = getRoleColor();
  const notifications = getNotifications();
  const unreadCount = notifications.length;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 right-0 left-0 lg:left-64 z-20">
      <div className="px-4 sm:px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Search Bar - Hidden on mobile, shown on larger screens */}
          <div className="hidden md:flex items-center space-x-4 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${userRole === 'student' ? 'courses, quizzes...' : userRole === 'faculty' ? 'students, courses...' : 'users, courses...'}`}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          
          {/* Mobile Search Button */}
          <div className="md:hidden">
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
              <Search className="w-5 h-5" />
            </button>
          </div>
          
          {/* Right Side Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
              >
                <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">{notification.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          </div>
                          <span className="text-xs text-gray-500">{notification.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-gray-200">
                    <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
                      View All Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings - Hidden on mobile */}
            <button className="hidden sm:block p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
              <Settings className="w-6 h-6" />
            </button>
            
            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-2 sm:space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-${color}-600 to-${color}-700 rounded-full flex items-center justify-center`}>
                  <span className="text-white font-semibold text-xs sm:text-sm">
                    {userData?.firstName?.[0]}{userData?.lastName?.[0]}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {userData?.displayName || currentUser?.displayName || currentUser?.email}
                  </p>
                  <p className="text-xs text-gray-500">{getRoleDisplayName()}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  {/* Profile Header */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-${color}-600 to-${color}-700 rounded-full flex items-center justify-center`}>
                        <span className="text-white font-semibold">
                          {userData?.firstName?.[0]}{userData?.lastName?.[0]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {userData?.firstName} {userData?.lastName}
                        </h3>
                        <p className="text-xs text-gray-500">{getRoleDisplayName()}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{userData?.email}</span>
                          </div>
                          {userData?.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3 h-3" />
                              <span>{userData.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile Actions */}
                  <div className="p-2">
                    <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      <User className="w-4 h-4" />
                      <span>View Profile</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      <Settings className="w-4 h-4" />
                      <span>Account Settings</span>
                    </button>
                  </div>

                  {/* Role-specific Info */}
                  <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <div className="text-xs text-gray-600 space-y-1">
                      {userRole === 'student' && userData?.registrationNumber && (
                        <div>Registration: {userData.registrationNumber}</div>
                      )}
                      {userRole === 'faculty' && userData?.facultyId && (
                        <div>Faculty ID: {userData.facultyId}</div>
                      )}
                      {userRole === 'faculty' && userData?.department && (
                        <div>Department: {userData.department}</div>
                      )}
                      {userRole === 'admin' && (
                        <div>System Administrator Access</div>
                      )}
                    </div>
                  </div>

                  {/* Logout */}
                  <div className="p-2 border-t border-gray-200">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;