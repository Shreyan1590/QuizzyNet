import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { createClient, User } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

type RoleType = 'student' | 'faculty' | 'admin' | null;

interface StudentData {
  uid: string;
  email: string;
  registration_number: string;
  full_name: string;
  is_blocked: boolean;
  enrolled_courses: string[];
  completed_courses: string[];
  disciplinary_actions: string[];
  learning_progress: {
    total_courses: number;
    completed_courses: number;
    average_grade: number;
    total_quizzes: number;
    average_score: number;
  };
  created_at: string;
  role: 'student';
}

interface FacultyData {
  uid: string;
  email: string;
  faculty_id: string;
  full_name: string;
  department: string;
  is_approved: boolean;
  courses: string[];
  analytics: {
    total_courses: number;
    total_students: number;
    total_quizzes: number;
    average_student_score: number;
  };
  created_at: string;
  role: 'faculty';
}

interface AdminData {
  uid: string;
  email: string;
  full_name: string;
  role: 'admin';
}

type UserData = StudentData | FacultyData | AdminData | null;

interface AuthContextType {
  currentUser: User | null;
  userRole: RoleType;
  userData: UserData;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: Omit<StudentData, 'uid' | 'email' | 'role' | 'created_at' | keyof StudentData['learning_progress']>) => Promise<void>;
  facultyLogin: (email: string, password: string) => Promise<void>;
  facultyRegister: (email: string, password: string, userData: Omit<FacultyData, 'uid' | 'email' | 'role' | 'created_at' | keyof FacultyData['analytics']>) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const executeAuthOperation = async (
  operation: () => Promise<void>,
  successMessage: string
) => {
  try {
    await operation();
    toast.success(successMessage);
  } catch (error: any) {
    const message = error.message || 'Authentication failed';
    toast.error(message);
    throw error;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<RoleType>(null);
  const [userData, setUserData] = useState<UserData>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserData = async (user: User | null = currentUser) => {
    if (!user) {
      setUserRole(null);
      setUserData(null);
      return;
    }

    try {
      // Check admin first
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('uid', user.id)
        .single();

      if (adminData && !adminError) {
        setUserRole('admin');
        setUserData({ ...adminData, uid: user.id, role: 'admin' } as AdminData);
        return;
      }

      // Check faculty
      const { data: facultyData, error: facultyError } = await supabase
        .from('faculty')
        .select('*')
        .eq('uid', user.id)
        .single();

      if (facultyData && !facultyError) {
        if (!facultyData.is_approved) {
          await logout();
          throw new Error('Faculty account pending approval');
        }
        setUserRole('faculty');
        setUserData({ ...facultyData, uid: user.id, role: 'faculty' } as FacultyData);
        return;
      }

      // Check student
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('uid', user.id)
        .single();

      if (studentData && !studentError) {
        if (studentData.is_blocked) {
          await logout();
          throw new Error('Account blocked');
        }
        setUserRole('student');
        setUserData({ ...studentData, uid: user.id, role: 'student' } as StudentData);
        return;
      }

      // No matching account found
      await logout();
      throw new Error('User account not found');
    } catch (error: any) {
      console.error('Error refreshing user data:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    return executeAuthOperation(async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user returned');

      await refreshUserData(data.user);
    }, 'Login successful!');
  };

  const register = async (
    email: string, 
    password: string, 
    userData: Omit<StudentData, 'uid' | 'email' | 'role' | 'created_at' | keyof StudentData['learning_progress']>
  ) => {
    return executeAuthOperation(async () => {
      // Check if registration number exists
      const { data: existingStudent, error: regError } = await supabase
        .from('students')
        .select('registration_number')
        .eq('registration_number', userData.registration_number)
        .single();

      if (existingStudent && !regError) {
        throw new Error('Registration number already exists');
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error('No user returned');

      const newStudent: StudentData = {
        uid: signUpData.user.id,
        email,
        role: 'student',
        created_at: new Date().toISOString(),
        is_blocked: false,
        enrolled_courses: [],
        completed_courses: [],
        disciplinary_actions: [],
        learning_progress: {
          total_courses: 0,
          completed_courses: 0,
          average_grade: 0,
          total_quizzes: 0,
          average_score: 0
        },
        ...userData
      };

      const { error: insertError } = await supabase
        .from('students')
        .insert(newStudent);

      if (insertError) throw insertError;

      await refreshUserData(signUpData.user);
    }, 'Student registration successful!');
  };

  const facultyLogin = async (email: string, password: string) => {
    return executeAuthOperation(async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user returned');

      await refreshUserData(data.user);
    }, 'Faculty login successful!');
  };

  const facultyRegister = async (
    email: string, 
    password: string, 
    userData: Omit<FacultyData, 'uid' | 'email' | 'role' | 'created_at' | keyof FacultyData['analytics']>
  ) => {
    return executeAuthOperation(async () => {
      // Check if faculty ID exists
      const { data: existingFaculty, error: facultyError } = await supabase
        .from('faculty')
        .select('faculty_id')
        .eq('faculty_id', userData.faculty_id)
        .single();

      if (existingFaculty && !facultyError) {
        throw new Error('Faculty ID already exists');
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error('No user returned');

      const newFaculty: FacultyData = {
        uid: signUpData.user.id,
        email,
        role: 'faculty',
        created_at: new Date().toISOString(),
        is_approved: false,
        courses: [],
        analytics: {
          total_courses: 0,
          total_students: 0,
          total_quizzes: 0,
          average_student_score: 0
        },
        ...userData
      };

      const { error: insertError } = await supabase
        .from('faculty')
        .insert(newFaculty);

      if (insertError) throw insertError;

      await refreshUserData(signUpData.user);
    }, 'Faculty registration successful! Awaiting admin approval.');
  };

  const adminLogin = async (username: string, password: string) => {
    // Predefined admin credentials
    if (username === 'admin' && password === 'admin123') {
      const adminData = {
        uid: 'admin-system',
        email: 'admin@lms.com',
        full_name: 'System Administrator',
        role: 'admin'
      };
      
      // Simulate a Supabase user
      const adminUser = {
        id: 'admin-system',
        email: 'admin@lms.com',
        user_metadata: { full_name: 'System Administrator' }
      } as User;
      
      setCurrentUser(adminUser);
      setUserRole('admin');
      setUserData(adminData);
      toast.success('Admin login successful!');
    } else {
      toast.error('Invalid admin credentials');
      throw new Error('Invalid credentials');
    }
  };

  const logout = async () => {
    return executeAuthOperation(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setCurrentUser(null);
      setUserRole(null);
      setUserData(null);
    }, 'Logged out successfully');
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        setCurrentUser(session?.user || null);
        await refreshUserData(session?.user || null);
      } catch (error) {
        console.error('Auth state change error:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    userRole,
    userData,
    loading,
    login,
    register,
    facultyLogin,
    facultyRegister,
    adminLogin,
    logout,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};