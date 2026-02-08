import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Your Firebase configuration
// Get these values from Firebase Console > Project Settings > General
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

// Initialize Firebase only when configuration is present
const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
if (!hasFirebaseConfig) {
  console.warn('Firebase config missing. Running in offline mode.');
}

// Initialize services
export const isFirebaseConfigured = hasFirebaseConfig;
export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;

// Initialize Analytics (optional, only in production)
let analytics = null;
if (app && typeof window !== 'undefined' && import.meta.env.PROD) {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;
