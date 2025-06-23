import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCLkJG1lYQ_PuMC7qIZofeaWB_yU7YuajI",
  authDomain: "quizmaster-pro-python.firebaseapp.com",
  projectId: "quizmaster-pro-python",
  storageBucket: "quizmaster-pro-python.firebasestorage.app",
  messagingSenderId: "82002532980",
  appId: "1:82002532980:web:bbe733ab49fad0ab978f21"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);