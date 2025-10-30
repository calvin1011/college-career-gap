'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import toast from 'react-hot-toast';
import { bypassEduValidation } from '@/config/superAdmin';

interface LoginFormProps {
  onToggleMode?: () => void;
}

export function LoginForm({ onToggleMode }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const { signIn, resetPassword } = useAuth();
  const router = useRouter();

  const validateEmail = (email: string): string | null => {
    if (!email) return 'Email is required';
    if (!email.includes('@')) return 'Please enter a valid email';

    // Check if it's a super admin OR .edu email
    if (!bypassEduValidation(email) && !email.toLowerCase().endsWith('.edu')) {
      return 'Please use your educational (.edu) email address';
    }

    return null;
  };

  const validatePassword = (password: string): string | null => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError) {
      toast.error(emailError);
      return;
    }
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
      router.push('/dashboard');
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    if (emailError) {
      toast.error(emailError);
      return;
    }

    try {
      await resetPassword(email);
      setShowResetPassword(false);
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to send reset email');
    }
  };

  if (showResetPassword) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <h2 className="text-2xl font-bold text-center text-gray-900">Reset Password</h2>
          <p className="text-center text-gray-600">Enter your email to receive a reset link</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <Input
              type="email"
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@university.edu"
              required
            />

            <div className="space-y-2">
              <Button type="submit" className="w-full">
                Send Reset Link
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowResetPassword(false)}
              >
                Back to Sign In
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-600">Sign in to The Resource Hub</p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@adams.edu"
            data-testid="email-input"
            required
          />

          <Input
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            data-testid="password-input"
            required
          />

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full"
              loading={loading}
              data-testid="signin-submit"
            >
              Sign In
            </Button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Forgot your password?
              </button>

              {onToggleMode && (
                <div>
                  <span className="text-sm text-gray-600">Don&apos;t have an account? </span>
                  <button
                    type="button"
                    onClick={onToggleMode}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                    data-testid="toggle-signup"
                  >
                    Sign up
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}