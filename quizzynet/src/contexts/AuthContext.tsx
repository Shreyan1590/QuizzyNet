import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { toast } from 'react-hot-toast';

interface UserData {
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
}

interface AuthContextType {
  currentUser: User | null;
  userRole: 'student' | 'admin' | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: UserData) => Promise<void>;
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

  const handleAuthError = (error: any) => {
    console.error('Auth error:', error);
    
    let errorMessage = 'Authentication failed';
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/user-disabled':
        errorMessage = 'Account disabled';
        break;
      case 'auth/user-not-found':
        errorMessage = 'User not found';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password';
        break;
      case 'auth/email-already-in-use':
        errorMessage = 'Email already in use';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password should be at least 6 characters';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Operation not allowed';
        break;
    }
    
    toast.error(errorMessage);
    throw new Error(errorMessage);
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      if (!userDoc.exists()) {
        throw new Error('User data not found');
      }
      
      const userData = userDoc.data();
      if (userData.isBlocked) {
        await signOut(auth);
        throw new Error('Your account has been blocked');
      }
      
      setUserRole(userData.role);
      toast.success('Login successful!');
    } catch (error) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, userData: UserData) => {
    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile with display name
      await updateProfile(result.user, {
        displayName: `${userData.firstName} ${userData.lastName}`
      });

      // Save additional user data to Firestore
      await setDoc(doc(db, 'users', result.user.uid), {
        ...userData,
        email,
        role: 'student',
        createdAt: new Date().toISOString(),
        isBlocked: false,
        tabSwitchCount: 0,
        lastLogin: null,
        profileComplete: false
      });

      setUserRole('student');
      toast.success('Registration successful!');
    } catch (error) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const adminLogin = async (username: string, password: string) => {
    try {
      setLoading(true);
      // In production, replace this with actual admin authentication
      if (username === 'Shreyan' && password === '123user123') {
        const adminData = {
          uid: 'admin-shreyan',
          email: 'admin@quiz.com',
          displayName: 'Admin Shreyan'
        };
        setCurrentUser(adminData as User);
        setUserRole('admin');
        toast.success('Admin login successful!');
      } else {
        throw new Error('Invalid admin credentials');
      }
    } catch (error) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      if (userRole === 'admin') {
        // Handle admin logout (mock user)
        setCurrentUser(null);
        setUserRole(null);
      } else {
        await signOut(auth);
      }
      toast.success('Logged out successfully');
    } catch (error) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.isBlocked) {
              await signOut(auth);
              toast.error('Your account has been blocked');
              return;
            }
            setUserRole(userData.role);
          }
          setCurrentUser(user);
        } else {
          setCurrentUser(null);
          setUserRole(null);
        }
      } catch (error) {
        handleAuthError(error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    loading,
    login,
    register,
    adminLogin,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};