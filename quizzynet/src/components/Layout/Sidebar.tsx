import React from 'react';
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
  Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const { userRole } = useAuth();
  const location = useLocation();

  const getMenuItems = () => {
    switch (userRole) {
      case 'student':
        return [
          { name: 'Home', icon: Home, path: '/student' },
          { name: 'My Course', icon: BookOpen, path: '/student/courses' },
          { name: 'Enrollment', icon: UserPlus, path: '/student/enrollment' },
          { name: 'Quiz MCQ Examination', icon: FileQuestion, path: '/student/quiz' },
          { name: 'Disciplinary', icon: AlertTriangle, path: '/student/disciplinary' },
          { name: 'My Profile', icon: User, path: '/student/profile' }
        ];
      
      case 'faculty':
        return [
          { name: 'Home', icon: Home, path: '/faculty' },
          { name: 'Course', icon: BookOpen, path: '/faculty/courses' },
          { name: 'Result', icon: BarChart3, path: '/faculty/results' },
          { name: 'Student 360° View', icon: Users, path: '/faculty/students' },
          { name: 'My Profile', icon: User, path: '/faculty/profile' }
        ];
      
      case 'admin':
        return [
          { name: 'Dashboard', icon: Home, path: '/admin' },
          { name: 'Students', icon: GraduationCap, path: '/admin/students' },
          { name: 'Courses', icon: BookOpen, path: '/admin/courses' },
          { name: 'Quizzes', icon: FileQuestion, path: '/admin/quizzes' },
          { name: 'Disciplinary', icon: Shield, path: '/admin/disciplinary' }
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

  const color = getRoleColor();

  return (
    <div className="w-64 bg-white shadow-lg h-screen fixed left-0 top-0 z-30">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 bg-gradient-to-r from-${color}-600 to-${color}-700 rounded-lg flex items-center justify-center`}>
            {userRole === 'student' && <GraduationCap className="w-6 h-6 text-white" />}
            {userRole === 'faculty' && <Users className="w-6 h-6 text-white" />}
            {userRole === 'admin' && <Shield className="w-6 h-6 text-white" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">QuizzyNet</h2>
            <p className="text-sm text-gray-500 capitalize">{userRole} Portal</p>
          </div>
        </div>
      </div>

      <nav className="mt-6">
        <div className="px-3">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-3 py-3 mb-1 rounded-lg transition-all duration-200 ${
                isActive(item.path)
                  ? `bg-${color}-100 text-${color}-700 border-r-4 border-${color}-500`
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-5 h-5 mr-3 ${
                isActive(item.path) ? `text-${color}-600` : 'text-gray-400'
              }`} />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;