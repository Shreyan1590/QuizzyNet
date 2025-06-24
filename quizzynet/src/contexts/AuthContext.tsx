import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { toast } from 'react-hot-toast';

interface AuthContextType {
  currentUser: User | null;
  userRole: 'student' | 'admin' | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: any) => Promise<void>;
  adminLogin: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
  const [userRole, setUserRole] = useState<'student' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (userDoc.exists()) {
        setUserRole(userDoc.data().role);
      }
      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const register = async (email: string, password: string, userData: any) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', result.user.uid), {
        ...userData,
        email,
        role: 'student',
        createdAt: new Date().toISOString(),
        isBlocked: false,
        tabSwitchCount: 0
      });
      setUserRole('student');
      toast.success('Registration successful!');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const adminLogin = async (username: string, password: string) => {
    if (username === 'Shreyan' && password === '123user123') {
      // Create a mock admin user for demo purposes
      const adminData = {
        uid: 'admin-shreyan',
        email: 'admin@quiz.com',
        displayName: 'Admin Shreyan'
      };
      setCurrentUser(adminData as User);
      setUserRole('admin');
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
      } else {
        await signOut(auth);
      }
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  // Add this to your existing AuthContext
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Check if user is blocked
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().isBlocked) {
        await signOut(auth);
        // Store blocked status in session to prevent immediate re-login
        sessionStorage.setItem('blocked_user', 'true');
        window.location.href = '/blocked';
        return;
      }
      
      // Clear blocked status if it exists
      sessionStorage.removeItem('blocked_user');
      setCurrentUser(user);
      setUserRole(userDoc.data()?.role || null);
    } else {
      setCurrentUser(null);
      setUserRole(null);
    }
    setLoading(false);
  });

  return unsubscribe;
}, []);