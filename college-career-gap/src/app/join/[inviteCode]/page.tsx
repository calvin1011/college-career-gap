'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';

export default function JoinPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const inviteCode = params.inviteCode as string;
  const [message, setMessage] = useState('Processing your invite...');

  useEffect(() => {
    if (!inviteCode) {
      setMessage('Invalid invite link.');
      router.push('/');
      return;
    }

    // Store the invite code in localStorage to be used after login/signup
    localStorage.setItem('pendingInvite', inviteCode);

    if (loading) {
      // Wait for auth state to be determined
      return;
    }

    if (user) {
      // User is already logged in.
      // The login logic in AuthContext will handle the pending invite.
      // Redirect to dashboard, which will then handle redirect to channel.
      setMessage('Redirecting to your dashboard...');
      router.push('/dashboard');
    } else {
      // User is not logged in.
      // Redirect to homepage, pre-filled for signup.
      setMessage('Please sign up or log in to join...');
      router.push(`/?authMode=signup&invite=${inviteCode}`);
    }

  }, [user, loading, inviteCode, router]);

  // This page is just a loading/redirect screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="max-w-md mx-auto text-center p-8">
        <CardContent>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold mb-2">Processing Invite</h2>
          <p className="text-gray-600">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}