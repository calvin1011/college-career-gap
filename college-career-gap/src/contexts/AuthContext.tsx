'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '@/services/firebase/config';
import { User, Channel } from '@/types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, major: string) => Promise<void>;
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setFirebaseUser(firebaseUser);

        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = { uid: userDoc.id, ...userDoc.data() } as User;
            setUser(userData);
          } else {
            // This case handles a newly signed-up user before their Firestore profile is created.
            // We set a basic user object to prevent premature redirects.
            // FIX: Add a type assertion to handle the potential for null email.
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email as string,
              displayName: firebaseUser.displayName || 'New User',
              major: '', // Major is not yet in the user doc
              role: 'student',
              isVerified: firebaseUser.emailVerified,
              joinedChannels: [],
              createdAt: new Date(),
              lastActiveAt: new Date(),
              profile: {},
            });
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUser(null);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const validateEducationalEmail = (email: string): boolean => {
    return email.toLowerCase().endsWith('.edu');
  };

  const signUp = async (email: string, password: string, displayName: string, major: string) => {
    if (!validateEducationalEmail(email)) {
      throw new Error('Please use your educational (.edu) email address');
    }

    try {
      setLoading(true);

      const result = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(result.user);

      const userProfile: Omit<User, 'uid'> = {
        email,
        displayName,
        major,
        role: 'student',
        isVerified: false,
        joinedChannels: [],
        createdAt: new Date(),
        lastActiveAt: new Date(),
        profile: {}
      };

      await setDoc(doc(db, 'users', result.user.uid), userProfile);

      // Auto-join the user to their major-specific channel
      const channelRef = doc(db, 'channels', major.toLowerCase().replace(/\s/g, '-'));
      await updateDoc(channelRef, {
        members: arrayUnion(result.user.uid)
      });

      toast.success('Account created! Please check your email to verify your account.');
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back!');
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent');
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw new Error(error.message || 'Failed to send reset email');
    }
  };

  const value = {
    user,
    firebaseUser,
    loading,
    signIn,
    signUp,
    signOut: handleSignOut,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
