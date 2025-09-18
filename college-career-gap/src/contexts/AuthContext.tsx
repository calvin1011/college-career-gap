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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase/config';
import { User, Major } from '@/types';
import toast from 'react-hot-toast';
import { findChannelByMajor, joinChannel } from '@/components/channels/ChannelService';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userCredential) => {
      setFirebaseUser(userCredential);

      if (userCredential && userCredential.emailVerified) {
        try {
          const userDocRef = doc(db, 'users', userCredential.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = { uid: userDoc.id, ...userDoc.data() } as User;
            setUser(userData);

            if (!userData.major) {
              if (window.location.pathname !== '/dashboard/profile') {
                router.push('/dashboard/profile');
              }
            } else {
              if (window.location.pathname === '/dashboard/profile') {
                router.push('/dashboard');
              }
            }
          } else {
             router.push('/dashboard/profile');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const validateEducationalEmail = (email: string): boolean => {
    return email.toLowerCase().endsWith('.edu');
  };

  const signUp = async (email: string, password: string, displayName: string, major: Major | '') => {
    if (!validateEducationalEmail(email)) {
      throw new Error('Please use your educational (.edu) email address');
    }

    try {
      setLoading(true);

      const result = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(result.user);

      // We now create a user profile with an empty major,
      // forcing them to the profile setup page on first login after verification.
      const userProfile: Omit<User, 'uid'> = {
        email,
        displayName: displayName, // Keep display name from sign-up
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
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      if (!userCredential.user.emailVerified) {
          toast.error('Please verify your email before signing in.');
          await signOut(auth);
          return;
      }

      toast.success('Welcome back!');
      // **NO REDIRECT HERE** - The useEffect will handle it.
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
      router.push('/');
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
      throw new Error(error.message || 'Failed to send password reset email');
    }
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