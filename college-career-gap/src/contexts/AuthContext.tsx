'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase/config';
import { User, Major } from '@/types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, major: Major | '') => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (userCredential) => {
      setFirebaseUser(userCredential || null);
      if (!userCredential) setLoading(false);
    });

    let unsubscribeFirestore: (() => void) | undefined;

    if (firebaseUser) {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      unsubscribeFirestore = onSnapshot(
        userDocRef,
        (doc) => {
          if (doc.exists()) {
            setUser({ uid: doc.id, ...doc.data() } as User);
          } else {
            setUser(null);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error listening to user document:", error);
          setUser(null);
          setLoading(false);
        }
      );
    } else {
      setUser(null);
    }

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, [firebaseUser]);


  const validateEducationalEmail = (email: string): boolean => {
    return email.toLowerCase().endsWith('.edu');
  };

  const signUp = async (email: string, password: string, displayName: string, major: Major | '') => {
    if (!validateEducationalEmail(email)) {
      throw new Error('Please use your educational (.edu) email address');
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(result.user);

      const userProfile: Omit<User, 'uid'> = {
        email,
        displayName: displayName,
        major: major || '',
        role: 'student',
        isVerified: false,
        joinedChannels: [],
        createdAt: new Date(),
        lastActiveAt: new Date(),
        profile: {},
      };

      await setDoc(doc(db, 'users', result.user.uid), userProfile);
      toast.success('Account created! Please check your email to verify your account.');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create account');
    }
  };

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!userCredential.user.emailVerified) {
        toast.error('Please verify your email before signing in.');
        await signOut(auth);
        throw new Error('Email not verified');
    }
    toast.success('Welcome back!');
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null); // Explicitly clear local user state on sign out
    setFirebaseUser(null);
    toast.success('Signed out successfully');
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
    toast.success('Password reset email sent');
  };

  const value = {
    user,
    firebaseUser,
    loading,
    signIn,
    signUp,
    signOut: handleSignOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}