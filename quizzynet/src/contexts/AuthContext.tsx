import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/supabase';
import { toast } from 'react-hot-toast';

type RoleType = 'student' | 'faculty' | 'admin' | null;

interface StudentData {
  uid: string;
  email: string;
  registrationNumber: string;
  fullName: string;
  isBlocked: boolean;
  enrolledCourses: string[];
  completedCourses: string[];
  disciplinaryActions: string[];
  learningProgress: {
    totalCourses: number;
    completedCourses: number;
    averageGrade: number;
    totalQuizzes: number;
    averageScore: number;
  };
  createdAt: Date;
  role: 'student';
}

interface FacultyData {
  uid: string;
  email: string;
  facultyId: string;
  fullName: string;
  department: string;
  isApproved: boolean;
  courses: string[];
  analytics: {
    totalCourses: number;
    totalStudents: number;
    totalQuizzes: number;
    averageStudentScore: number;
  };
  createdAt: Date;
  role: 'faculty';
}

interface AdminData {
  uid: string;
  email: string;
  fullName: string;
  role: 'admin';
}

type UserData = StudentData | FacultyData | AdminData | null;

interface AuthContextType {
  currentUser: User | null;
  userRole: RoleType;
  userData: UserData;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: Omit<StudentData, 'uid' | 'email' | 'role' | 'createdAt' | keyof StudentData['learningProgress']>) => Promise<void>;
  facultyLogin: (email: string, password: string) => Promise<void>;
  facultyRegister: (email: string, password: string, userData: Omit<FacultyData, 'uid' | 'email' | 'role' | 'createdAt' | keyof FacultyData['analytics']>) => Promise<void>;
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
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      if (adminDoc.exists()) {
        setUserRole('admin');
        setUserData({ ...adminDoc.data(), uid: user.uid, role: 'admin' } as AdminData);
        return;
      }

      // Check faculty
      const facultyDoc = await getDoc(doc(db, 'faculty', user.uid));
      if (facultyDoc.exists()) {
        const data = facultyDoc.data();
        if (!data.isApproved) {
          await logout();
          throw new Error('Faculty account pending approval');
        }
        setUserRole('faculty');
        setUserData({ ...data, uid: user.uid, role: 'faculty' } as FacultyData);
        return;
      }

      // Check student
      const studentDoc = await getDoc(doc(db, 'students', user.uid));
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        if (data.isBlocked) {
          await logout();
          throw new Error('Account blocked');
        }
        setUserRole('student');
        setUserData({ ...data, uid: user.uid, role: 'student' } as StudentData);
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await refreshUserData(userCredential.user);
    }, 'Login successful!');
  };

  const register = async (
    email: string, 
    password: string, 
    userData: Omit<StudentData, 'uid' | 'email' | 'role' | 'createdAt' | keyof StudentData['learningProgress']>
  ) => {
    return executeAuthOperation(async () => {
      // Check if registration number exists
      const regQuery = query(
        collection(db, 'students'),
        where('registrationNumber', '==', userData.registrationNumber)
      );
      const regSnapshot = await getDocs(regQuery);
      
      if (!regSnapshot.empty) {
        throw new Error('Registration number already exists');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      const newStudent: StudentData = {
        uid: userCredential.user.uid,
        email,
        role: 'student',
        createdAt: new Date(),
        isBlocked: false,
        enrolledCourses: [],
        completedCourses: [],
        disciplinaryActions: [],
        learningProgress: {
          totalCourses: 0,
          completedCourses: 0,
          averageGrade: 0,
          totalQuizzes: 0,
          averageScore: 0
        },
        ...userData
      };

      await setDoc(doc(db, 'students', userCredential.user.uid), newStudent);
      await refreshUserData(userCredential.user);
    }, 'Student registration successful!');
  };

  const facultyLogin = async (email: string, password: string) => {
    return executeAuthOperation(async () => {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await refreshUserData(userCredential.user);
    }, 'Faculty login successful!');
  };

  const facultyRegister = async (
    email: string, 
    password: string, 
    userData: Omit<FacultyData, 'uid' | 'email' | 'role' | 'createdAt' | keyof FacultyData['analytics']>
  ) => {
    return executeAuthOperation(async () => {
      // Check if faculty ID exists
      const facultyQuery = query(
        collection(db, 'faculty'),
        where('facultyId', '==', userData.facultyId)
      );
      const facultySnapshot = await getDocs(facultyQuery);
      
      if (!facultySnapshot.empty) {
        throw new Error('Faculty ID already exists');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      const newFaculty: FacultyData = {
        uid: userCredential.user.uid,
        email,
        role: 'faculty',
        createdAt: new Date(),
        isApproved: false,
        courses: [],
        analytics: {
          totalCourses: 0,
          totalStudents: 0,
          totalQuizzes: 0,
          averageStudentScore: 0
        },
        ...userData
      };

      await setDoc(doc(db, 'faculty', userCredential.user.uid), newFaculty);
      await refreshUserData(userCredential.user);
    }, 'Faculty registration successful! Awaiting admin approval.');
  };

  const adminLogin = async (username: string, password: string) => {
    // Predefined admin credentials
    if (username === 'admin' && password === 'admin123') {
      const adminData = {
        uid: 'admin-system',
        email: 'admin@lms.com',
        displayName: 'System Administrator',
        role: 'admin'
      };
      setCurrentUser(adminData as User);
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
      await signOut(auth);
      setCurrentUser(null);
      setUserRole(null);
      setUserData(null);
    }, 'Logged out successfully');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setCurrentUser(user);
        await refreshUserData(user);
      } catch (error) {
        console.error('Auth state change error:', error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
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