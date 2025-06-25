import React from 'react';
import { LogOut, Bell, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Header: React.FC = () => {
  const { currentUser, userRole, userData, logout } = useAuth();

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

  const color = getRoleColor();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 right-0 left-64 z-20">
      <div className="px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 bg-gradient-to-r from-${color}-600 to-${color}-700 rounded-full flex items-center justify-center`}>
                <span className="text-white font-semibold text-sm">
                  {userData?.firstName?.[0]}{userData?.lastName?.[0]}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {userData?.displayName || currentUser?.displayName || currentUser?.email}
                </p>
                <p className="text-xs text-gray-500">
                  {userRole === 'student' && userData?.registrationNumber}
                  {userRole === 'faculty' && userData?.facultyId}
                  {userRole === 'admin' && 'System Administrator'}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;