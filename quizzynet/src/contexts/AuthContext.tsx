import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { toast } from 'react-hot-toast';

interface AuthContextType {
  currentUser: User | null;
  userRole: 'student' | 'faculty' | 'admin' | null;
  userData: any;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: any) => Promise<void>;
  facultyLogin: (email: string, password: string) => Promise<void>;
  facultyRegister: (email: string, password: string, userData: any) => Promise<void>;
  adminLogin: (username: string, password: string) => Promise<void>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'student' | 'faculty' | 'admin' | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserData = async (user: User | null) => {
    if (!user) {
      setUserRole(null);
      setUserData(null);
      return;
    }

    try {
      // Check admin first (since it's a special case)
      if (user.email === 'admin@lms.com') {
        setUserRole('admin');
        setUserData({
          uid: user.uid,
          email: user.email,
          displayName: 'System Administrator',
          role: 'admin'
        });
        return;
      }

      // Check student collection
      const studentDoc = await getDoc(doc(db, 'students', user.uid));
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        setUserRole('student');
        setUserData(data);
        return;
      }

      // Check faculty collection
      const facultyDoc = await getDoc(doc(db, 'faculty', user.uid));
      if (facultyDoc.exists()) {
        const data = facultyDoc.data();
        setUserRole('faculty');
        setUserData(data);
        return;
      }

      // If no matching role found
      setUserRole(null);
      setUserData(null);
      await signOut(auth);
      toast.error('No valid user account found');
    } catch (error) {
      console.error('Error refreshing user data:', error);
      setUserRole(null);
      setUserData(null);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      await refreshUserData(result.user);
      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, userData: any) => {
    try {
      // Check if registration number already exists
      const regQuery = query(
        collection(db, 'students'),
        where('registrationNumber', '==', userData.registrationNumber)
      );
      const regSnapshot = await getDocs(regQuery);
      
      if (!regSnapshot.empty) {
        toast.error('Registration number already exists');
        throw new Error('Registration number already exists');
      }

      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'students', result.user.uid), {
        ...userData,
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
        }
      });
      
      setUserRole('student');
      setUserData({ ...userData, email, role: 'student' });
      toast.success('Student registration successful!');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const facultyLogin = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'faculty', result.user.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (!data.isApproved) {
          await signOut(auth);
          toast.error('Your faculty account is pending admin approval');
          throw new Error('Account pending approval');
        }
        setUserRole('faculty');
        setUserData(data);
      } else {
        await signOut(auth);
        toast.error('Faculty account not found');
        throw new Error('Faculty account not found');
      }
      
      toast.success('Faculty login successful!');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const facultyRegister = async (email: string, password: string, userData: any) => {
    try {
      // Check if faculty ID already exists
      const facultyQuery = query(
        collection(db, 'faculty'),
        where('facultyId', '==', userData.facultyId)
      );
      const facultySnapshot = await getDocs(facultyQuery);
      
      if (!facultySnapshot.empty) {
        toast.error('Faculty ID already exists');
        throw new Error('Faculty ID already exists');
      }

      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'faculty', result.user.uid), {
        ...userData,
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
        }
      });
      
      setUserRole('faculty');
      setUserData({ ...userData, email, role: 'faculty' });
      toast.success('Faculty registration successful! Awaiting admin approval.');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const adminLogin = async (username: string, password: string) => {
    try {
      setLoading(true);
      if (username === 'admin' && password === 'admin123') {
        const adminUser = {
          uid: 'admin-system',
          email: 'admin@lms.com',
          displayName: 'System Administrator'
        } as User;
        
        setCurrentUser(adminUser);
        setUserRole('admin');
        setUserData({
          ...adminUser,
          role: 'admin'
        });
        toast.success('Admin login successful!');
      } else {
        throw new Error('Invalid admin credentials');
      }
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      if (userRole !== 'admin') {
        await signOut(auth);
      }
      setCurrentUser(null);
      setUserRole(null);
      setUserData(null);
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setLoading(true);
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
    refreshUserData: () => refreshUserData(currentUser)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};