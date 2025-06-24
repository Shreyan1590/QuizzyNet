import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCLkJG1lYQ_PuMC7qIZofeaWB_yU7YuajI",
  authDomain: "quizmaster-pro-python.firebaseapp.com",
  projectId: "quizmaster-pro-python",
  storageBucket: "quizmaster-pro-python.firebasestorage.app",
  messagingSenderId: "82002532980",
  appId: "1:82002532980:web:bbe733ab49fad0ab978f21"
};

// Initialize Firebase - check if app already exists to prevent duplicate initialization
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;