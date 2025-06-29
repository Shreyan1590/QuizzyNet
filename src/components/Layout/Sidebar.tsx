import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  BookOpen, 
  UserPlus, 
  FileQuestion, 
  AlertTriangle, 
  User,
  Users,
  BarChart3,
  Settings,
  GraduationCap,
  Award,
  Shield,
  Eye,
  Target,
  Calendar,
  TrendingUp,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const { userRole, userData } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getMenuItems = () => {
    switch (userRole) {
      case 'student':
        return [
          { name: 'Home', icon: Home, path: '/student', description: 'Dashboard overview' },
          { name: 'My Courses', icon: BookOpen, path: '/student/courses', description: 'Enrolled courses' },
          { name: 'Enrollment', icon: UserPlus, path: '/student/enrollment', description: 'Browse & enroll' },
          { name: 'Quiz MCQ Examination', icon: FileQuestion, path: '/student/quiz', description: 'Take quizzes' },
          { name: 'Disciplinary Records', icon: AlertTriangle, path: '/student/disciplinary', description: 'View records' },
          { name: 'My Profile', icon: User, path: '/student/profile', description: 'Account settings' }
        ];
      
      case 'faculty':
        return [
          { name: 'Home', icon: Home, path: '/faculty', description: 'Dashboard overview' },
          { name: 'Course Management', icon: BookOpen, path: '/faculty/courses', description: 'Create & manage courses' },
          { name: 'Result Analytics', icon: BarChart3, path: '/faculty/results', description: 'Performance insights' },
          { name: 'Student 360° View', icon: Users, path: '/faculty/students', description: 'Student insights' },
          { name: 'My Profile', icon: User, path: '/faculty/profile', description: 'Account settings' }
        ];
      
      case 'admin':
        return [
          { name: 'Dashboard', icon: Home, path: '/admin', description: 'System overview' },
          { name: 'Student Management', icon: GraduationCap, path: '/admin/students', description: 'Manage students' },
          { name: 'Course Approval', icon: BookOpen, path: '/admin/courses', description: 'Approve courses' },
          { name: 'Quiz Control', icon: FileQuestion, path: '/admin/quizzes', description: 'Monitor quizzes' },
          { name: 'Disciplinary Management', icon: Shield, path: '/admin/disciplinary', description: 'Handle violations' }
        ];
      
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getRoleColor = () => {
    switch (userRole) {
      case 'student': return 'blue';
      case 'faculty': return 'green';
      case 'admin': return 'purple';
      default: return 'gray';
    }
  };

  const getRoleInfo = () => {
    switch (userRole) {
      case 'student':
        return {
          title: 'Student Portal',
          subtitle: userData?.registrationNumber || 'Student',
          icon: GraduationCap
        };
      case 'faculty':
        return {
          title: 'Faculty Portal',
          subtitle: userData?.facultyId || 'Faculty',
          icon: Users
        };
      case 'admin':
        return {
          title: 'Admin Portal',
          subtitle: 'System Administrator',
          icon: Shield
        };
      default:
        return {
          title: 'QuizzyNet Portal',
          subtitle: 'Portal',
          icon: GraduationCap
        };
    }
  };

  const color = getRoleColor();
  const roleInfo = getRoleInfo();

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-gray-600" />
        ) : (
          <Menu className="w-6 h-6 text-gray-600" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={`
        w-64 bg-white shadow-xl h-screen fixed left-0 top-0 z-40 border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-${color}-600 to-${color}-700 rounded-xl flex items-center justify-center shadow-lg`}>
              <roleInfo.icon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">QuizzyNet - SIMATS</h2>
              <p className="text-sm text-gray-600">{roleInfo.title}</p>
            </div>
          </div>
          
          {/* User Info */}
          <div className="mt-4 p-3 bg-white rounded-lg shadow-sm border">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 bg-${color}-100 rounded-full flex items-center justify-center`}>
                <span className={`text-${color}-600 font-semibold text-sm`}>
                  {userData?.firstName?.[0]}{userData?.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userData?.firstName} {userData?.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{roleInfo.subtitle}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3 flex-1 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive(item.path)
                    ? `bg-${color}-100 text-${color}-700 shadow-sm border-l-4 border-${color}-500`
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 ${
                  isActive(item.path) ? `text-${color}-600` : 'text-gray-400 group-hover:text-gray-600'
                }`} />
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs opacity-75 hidden sm:block">{item.description}</div>
                </div>
                {isActive(item.path) && (
                  <div className={`w-2 h-2 bg-${color}-500 rounded-full`}></div>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* Quick Stats */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-2">Quick Stats</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {userRole === 'student' && (
                <>
                  <div className="bg-white rounded-lg p-2 shadow-sm">
                    <div className="font-semibold text-blue-600">{userData?.enrolledCourses?.length || 0}</div>
                    <div className="text-gray-500">Courses</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 shadow-sm">
                    <div className="font-semibold text-green-600">85%</div>
                    <div className="text-gray-500">Avg Score</div>
                  </div>
                </>
              )}
              {userRole === 'faculty' && (
                <>
                  <div className="bg-white rounded-lg p-2 shadow-sm">
                    <div className="font-semibold text-green-600">{userData?.courses?.length || 0}</div>
                    <div className="text-gray-500">Courses</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 shadow-sm">
                    <div className="font-semibold text-blue-600">120</div>
                    <div className="text-gray-500">Students</div>
                  </div>
                </>
              )}
              {userRole === 'admin' && (
                <>
                  <div className="bg-white rounded-lg p-2 shadow-sm">
                    <div className="font-semibold text-purple-600">1,250</div>
                    <div className="text-gray-500">Users</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 shadow-sm">
                    <div className="font-semibold text-green-600">98%</div>
                    <div className="text-gray-500">Uptime</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;