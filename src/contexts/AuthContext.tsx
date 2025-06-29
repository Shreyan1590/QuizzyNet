import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
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
  const [authInitialized, setAuthInitialized] = useState(false);

  const refreshUserData = async (user?: User) => {
    const targetUser = user || currentUser;
    if (!targetUser) {
      setUserRole(null);
      setUserData(null);
      return;
    }

    try {
      // Check student collection first
      const studentDoc = await getDoc(doc(db, 'students', targetUser.uid));
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        setUserRole('student');
        setUserData(data);
        return;
      }

      // Check faculty collection
      const facultyDoc = await getDoc(doc(db, 'faculty', targetUser.uid));
      if (facultyDoc.exists()) {
        const data = facultyDoc.data();
        setUserRole('faculty');
        setUserData(data);
        return;
      }

      // If no user data found, clear everything
      setUserRole(null);
      setUserData(null);
    } catch (error) {
      console.error('Error refreshing user data:', error);
      setUserRole(null);
      setUserData(null);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if user exists in students collection
      const studentDoc = await getDoc(doc(db, 'students', result.user.uid));
      
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        if (data.isBlocked) {
          await signOut(auth);
          toast.error('Your Account is Blocked. Contact Faculty/Admin to resolve this');
          throw new Error('Account blocked');
        }
        setUserRole('student');
        setUserData(data);
        toast.success('Login successful!');
        return;
      }

      // Check if user exists in faculty collection
      const facultyDoc = await getDoc(doc(db, 'faculty', result.user.uid));
      if (facultyDoc.exists()) {
        await signOut(auth);
        toast.error('This account is registered as Faculty. Please use the Faculty Portal to login.');
        throw new Error('Wrong portal - use Faculty Portal');
      }

      // If not found in either collection
      await signOut(auth);
      toast.error('Student account not found. Please register as a student or use the correct portal.');
      throw new Error('Student account not found');
      
    } catch (error: any) {
      if (!error.message.includes('Wrong portal') && !error.message.includes('Student account not found') && !error.message.includes('Account blocked')) {
        toast.error('Login failed: ' + error.message);
      }
      throw error;
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
      const newUserData = {
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
      };
      
      await setDoc(doc(db, 'students', result.user.uid), newUserData);
      
      setUserRole('student');
      setUserData(newUserData);
      toast.success('Student registration successful!');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const facultyLogin = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if user exists in faculty collection
      const facultyDoc = await getDoc(doc(db, 'faculty', result.user.uid));
      
      if (facultyDoc.exists()) {
        const data = facultyDoc.data();
        if (!data.isApproved) {
          await signOut(auth);
          toast.error('Your faculty account is pending admin approval');
          throw new Error('Account pending approval');
        }
        setUserRole('faculty');
        setUserData(data);
        toast.success('Faculty login successful!');
        return;
      }

      // Check if user exists in students collection
      const studentDoc = await getDoc(doc(db, 'students', result.user.uid));
      if (studentDoc.exists()) {
        await signOut(auth);
        toast.error('This account is registered as Student. Please use the Student Portal to login.');
        throw new Error('Wrong portal - use Student Portal');
      }

      // If not found in either collection
      await signOut(auth);
      toast.error('Faculty account not found. Please register as faculty or use the correct portal.');
      throw new Error('Faculty account not found');
      
    } catch (error: any) {
      if (!error.message.includes('Wrong portal') && !error.message.includes('Faculty account not found') && !error.message.includes('Account pending approval')) {
        toast.error('Login failed: ' + error.message);
      }
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
      const newUserData = {
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
      };
      
      await setDoc(doc(db, 'faculty', result.user.uid), newUserData);
      
      setUserRole('faculty');
      setUserData(newUserData);
      toast.success('Faculty registration successful! Awaiting admin approval.');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
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
    try {
      if (userRole === 'admin') {
        setCurrentUser(null);
        setUserRole(null);
        setUserData(null);
      } else {
        await signOut(auth);
      }
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        await refreshUserData(user);
      } else {
        setUserRole(null);
        setUserData(null);
      }
      
      if (!authInitialized) {
        setAuthInitialized(true);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [authInitialized]);

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
      {children}
    </AuthContext.Provider>
  );
};