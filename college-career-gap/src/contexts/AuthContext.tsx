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
  deleteUser,
} from 'firebase/auth';
import { doc, onSnapshot, runTransaction, arrayUnion, increment, Transaction, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase/config';
import { User, Major } from '@/types';
import toast from 'react-hot-toast';
import { findChannelByMajor, deleteUserAccount, findChannelByInviteCode, joinChannel } from '@/components/channels/ChannelService';
import { isSuperAdmin, bypassEduValidation } from '@/config/superAdmin';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (
  email: string,
  password: string,
  displayName: string,
  university: string,
  major: Major,
  gradYear: string,
  subChannel?: string,
  secondMajor?: Major,
  secondMajorSubChannel?: string,
) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  handleDeleteAccount: () => Promise<void>;
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

  const handlePendingInvite = async (user: User): Promise<string | null> => {
    const pendingInvite = localStorage.getItem('pendingInvite');
    if (!pendingInvite || !user) return null;

    console.log(`Handling pending invite: ${pendingInvite}`);
    localStorage.removeItem('pendingInvite'); // Clear it immediately

    try {
      const channel = await findChannelByInviteCode(pendingInvite);
      if (channel && !user.joinedChannels.includes(channel.id)) {
        await joinChannel(channel.id, user.uid);
        toast.success(`Successfully joined ${channel.name}!`);
        return channel.slug; // Return slug for redirect
      } else if (channel) {
        toast(`You are already a member of ${channel.name}.`);
        return channel.slug; // Already a member, just redirect
      } else {
        toast.error('Invite link is invalid or has expired.');
      }
    } catch (error) {
      console.error('Failed to handle pending invite:', error);
      toast.error('Could not join channel from invite.');
    }
    return null;
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    university: string,
    major: Major,
    gradYear: string,
    subChannel?: string,
    secondMajor?: Major,
    secondMajorSubChannel?: string
  ) => {
    // Check if super admin OR .edu email
    if (!bypassEduValidation(email) && !email.toLowerCase().endsWith('.edu')) {
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

    // Validate second major is different from primary
    if (secondMajor && secondMajor === major) {
      throw new Error('Second major must be different from primary major.');
    }

    // Find primary channel (outside transaction)
    const primaryChannel = await findChannelByMajor(major);
    if (!primaryChannel) {
      throw new Error(`Could not find a channel for the major: ${major}`);
    }

    // Find second channel if specified (outside transaction)
    let secondChannel = null;
    if (secondMajor) {
      secondChannel = await findChannelByMajor(secondMajor);
      if (!secondChannel) {
        throw new Error(`Could not find a channel for the second major: ${secondMajor}`);
      }
    }

    // Create user in Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    try {
      const userRole = isSuperAdmin(email) ? 'admin' : 'student';

      // Build joined channels array
      const joinedChannels = [primaryChannel.id];
      if (secondChannel) {
        joinedChannels.push(secondChannel.id);
      }

      // Create the user profile object
      const userProfile: User = {
        uid: user.uid,
        email,
        displayName,
        major,
        secondMajor: secondMajor || null,
        subChannel: subChannel || null,
        secondMajorSubChannel: secondMajorSubChannel || null,
        role: userRole,
        isVerified: false,
        joinedChannels,
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
        profile: {
          university,
          graduationYear: graduationYear !== undefined ? graduationYear : null,
        },
      };

      // transaction to be READS-THEN-WRITES
      await runTransaction(db, async (transaction: Transaction) => {
        const userDocRef = doc(db, 'users', user.uid);
        const primaryChannelRef = doc(db, 'channels', primaryChannel.id);

        let secondChannelRef = null;
        if (secondChannel) {
          secondChannelRef = doc(db, 'channels', secondChannel.id);
        }

        const primaryChannelDoc = await transaction.get(primaryChannelRef); // READ 1
        if (!primaryChannelDoc.exists()) {
          throw new Error('Primary channel not found. Please contact support.');
        }

        if (secondChannelRef) {
          const secondChannelDoc = await transaction.get(secondChannelRef); // READ 2
          if (!secondChannelDoc.exists()) {
            throw new Error('Second channel not found. Please contact support.');
          }
        }

        transaction.set(userDocRef, userProfile);

        transaction.update(primaryChannelRef, {
          members: arrayUnion(user.uid),
          memberCount: increment(1),
        });

        if (secondChannelRef) {
          transaction.update(secondChannelRef, {
            members: arrayUnion(user.uid),
            memberCount: increment(1),
          });
        }
      });

      await sendEmailVerification(user);
      // Don't toast here, let the component handle it

    } catch (error) {
      console.error("Sign up transaction failed:", error);

      // Rollback: delete the auth user if transaction fails
      if (auth.currentUser?.uid === user.uid) {
        await user.delete();
      }

      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          throw new Error('Permission denied. Please try again or contact support.');
        }
        throw error;
      }
      throw new Error('Failed to create account. Please try again.');
    }
  };

const signIn = async (email: string, password: string): Promise<string | null> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    if (!isSuperAdmin(email) && !userCredential.user.emailVerified) {
      await signOut(auth);
      throw new Error('Please verify your email before signing in.');
    }

    // Handle pending invite on successful login
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = { uid: userDoc.id, ...userDoc.data() } as User;
      const channelSlug = await handlePendingInvite(userData);

      // If invite was handled, return the path to redirect to
      if (channelSlug) {
        return `/dashboard/channels/${channelSlug}`;
      }
    }

    toast.success('Welcome back!');
    return null; // No specific redirect
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

  const handleDeleteAccount = async () => {
    if (!firebaseUser || !user) {
      throw new Error("You must be logged in to delete an account.");
    }
    try {
      // Delete Firestore data (user document and channel memberships)
      await deleteUserAccount(user);

      // Delete the user from Firebase Authentication
      await deleteUser(firebaseUser);

      toast.success("Your account has been permanently deleted.");
    } catch (error: unknown) {
      console.error("Error deleting account:", error);
      // Handle re-authentication requirement if necessary
      if (error instanceof Error && error.message.includes('requires-recent-login')) {
        toast.error("This is a sensitive action. Please sign out and sign back in before deleting your account.");
      } else {
        toast.error("Failed to delete account. Please try again.");
      }
      throw error;
    }
  };


  const value = { user, firebaseUser, loading, signIn, signUp, signOut: handleSignOut, resetPassword, handleDeleteAccount };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}