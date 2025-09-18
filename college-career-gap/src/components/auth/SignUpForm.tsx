'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import toast from 'react-hot-toast';

interface SignUpFormProps {
  onToggleMode?: () => void;
}

export function SignUpForm({ onToggleMode }: SignUpFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { signUp } = useAuth();

  const validateForm = (): string | null => {
    if (!formData.email) return 'Email is required';
    if (!formData.email.toLowerCase().endsWith('.edu')) {
      return 'Please use your educational (.edu) email address';
    }
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    if (!formData.displayName) return 'Display name is required';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setLoading(true);
      // Pass an empty string for the major, as it will be set on the profile page
      await signUp(
        formData.email,
        formData.password,
        formData.displayName,
        ''
      );
      setShowSuccess(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  if (showSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Check Your Email</h2>
            <p className="text-gray-600 mt-2">
              We've sent a verification link to <strong>{formData.email}</strong>
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-sm text-blue-800">
                Please check your email and click the verification link to activate your account.
              </p>
            </div>

            {onToggleMode && (
              <Button variant="outline" className="w-full" onClick={onToggleMode}>
                Back to Sign In
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Join Adams State Hub</h2>
          <p className="text-gray-600">Create your account to access career resources</p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Email Address"
            value={formData.email}
            onChange={handleChange('email')}
            placeholder="your.email@adams.edu"
            data-testid="email-input"
            required
          />

          <Input
            type="text"
            label="Display Name"
            value={formData.displayName}
            onChange={handleChange('displayName')}
            placeholder="John Doe"
            data-testid="displayname-input"
            required
          />

          <Input
            type="password"
            label="Password"
            value={formData.password}
            onChange={handleChange('password')}
            placeholder="At least 8 characters"
            data-testid="password-input"
            required
          />

          <Input
            type="password"
            label="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            placeholder="Confirm your password"
            data-testid="confirm-password-input"
            required
          />

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full"
              loading={loading}
              data-testid="signup-submit"
            >
              Create Account
            </Button>

            {onToggleMode && (
              <div className="text-center">
                <span className="text-sm text-gray-600">Already have an account? </span>
                <button
                  type="button"
                  onClick={onToggleMode}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                  data-testid="toggle-signin"
                >
                  Sign in
                </button>
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}