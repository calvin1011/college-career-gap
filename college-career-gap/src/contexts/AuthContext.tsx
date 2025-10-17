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
import { doc, onSnapshot, runTransaction, arrayUnion, increment } from 'firebase/firestore';
import { auth, db } from '@/services/firebase/config';
import { User, Major } from '@/types';
import toast from 'react-hot-toast';
import { findChannelByMajor } from '@/components/channels/ChannelService';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, university: string, major: Major, gradYear: string) => Promise<void>;
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
      unsubscribeFirestore = onSnapshot(userDocRef, (doc) => {
        setUser(doc.exists() ? { uid: doc.id, ...doc.data() } as User : null);
        setLoading(false);
      }, (error) => {
        console.error("Error listening to user document:", error);
        setUser(null);
        setLoading(false);
      });
    } else {
      setUser(null);
    }

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [firebaseUser]);

  const signUp = async (email: string, password: string, displayName: string, university: string, major: Major, gradYear: string) => {
    if (!email.toLowerCase().endsWith('.edu')) {
        throw new Error('Please use your educational (.edu) email address');
    }

    const gradYearValue = gradYear.trim();
    let graduationYear: number | undefined;

    if (gradYearValue) {
        const parsedYear = parseInt(gradYearValue, 10);
        if (isNaN(parsedYear)) {
            throw new Error('Invalid graduation year provided.');
        }
        graduationYear = parsedYear;
    }

    const newChannel = await findChannelByMajor(major);
    if (!newChannel) {
        throw new Error(`Could not find a channel for the major: ${major}`);
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    try {
        const userProfile: User = {
            uid: user.uid,
            email,
            displayName,
            major,
            role: 'student',
            isVerified: false,
            joinedChannels: [newChannel.id],
            createdAt: new Date(),
            lastActiveAt: new Date(),
            profile: {
                university,
            },
        };

        if (graduationYear !== undefined) {
            userProfile.profile.graduationYear = graduationYear;
        }

        await runTransaction(db, async (transaction) => {
            const userDocRef = doc(db, 'users', user.uid);
            const channelDocRef = doc(db, 'channels', newChannel.id);

            transaction.set(userDocRef, userProfile);
            transaction.update(channelDocRef, {
                members: arrayUnion(user.uid),
                memberCount: increment(1),
            });
        });

        await sendEmailVerification(user, {
          url: `${window.location.origin}/dashboard`, // redirect here after verification
          handleCodeInApp: false,
        });

    } catch (error) {
        await user.delete();
        console.error("Sign up failed after user creation, rolling back.", error);
        throw new Error('Failed to save user profile. Please try again.');
    }
};

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!userCredential.user.emailVerified) {
      await signOut(auth);
      throw new Error('Please verify your email before signing in.');
    }
    toast.success('Welcome back!');
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
    toast.success('Signed out successfully');
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
    toast.success('Password reset email sent');
  };

  const value = { user, firebaseUser, loading, signIn, signUp, signOut: handleSignOut, resetPassword };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}