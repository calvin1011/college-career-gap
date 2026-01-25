import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, signInWithEmailAndPassword, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Declare process.env for TypeScript
declare const process: {
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY?: string;
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
    NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string;
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?: string;
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?: string;
    NEXT_PUBLIC_FIREBASE_APP_ID?: string;
  };
};

// Firebase config - will be injected by webpack
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
};

// Initialize Firebase (singleton pattern)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

export function initializeFirebase() {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    app = getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  }

  return { app, auth, db };
}

// Auth helpers for extension
export async function signInExtension(email: string, password: string): Promise<User> {
  const { auth } = initializeFirebase();
  const credential = await signInWithEmailAndPassword(auth, email, password);

  // Store auth state in chrome.storage
  await chrome.storage.local.set({
    authUser: {
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: credential.user.displayName,
    }
  });

  return credential.user;
}

export async function getAuthState(): Promise<User | null> {
  return new Promise((resolve) => {
    const { auth } = initializeFirebase();

    // Check Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function signOutExtension(): Promise<void> {
  const { auth } = initializeFirebase();
  await auth.signOut();
  await chrome.storage.local.remove('authUser');
}

// Get cached user from chrome.storage (faster than Firebase check)
export async function getCachedUser(): Promise<{ uid: string; email: string; displayName: string } | null> {
  const result = await chrome.storage.local.get('authUser');
  return result.authUser || null;
}

export { auth, db };