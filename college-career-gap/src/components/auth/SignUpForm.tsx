'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import toast from 'react-hot-toast';
import { Major, SUPPORTED_MAJORS } from '@/types';

interface SignUpFormProps {
  onToggleMode?: () => void;
}

export function SignUpForm({ onToggleMode }: SignUpFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    university: '',
    major: '',
    graduationYear: '',
  });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { signUp } = useAuth();

  const validateForm = (): string | null => {
    if (!formData.email.toLowerCase().endsWith('.edu')) return 'Please use an educational (.edu) email.';
    if (formData.password.length < 8) return 'Password must be at least 8 characters.';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match.';
    if (!formData.displayName) return 'Display name is required.';
    if (!formData.university) return 'University is required.';
    if (!formData.major) return 'Please select your major.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);
    try {
      await signUp(
        formData.email,
        formData.password,
        formData.displayName,
        formData.university,
        formData.major as Major,
        formData.graduationYear
      );
      setShowSuccess(true);
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  if (showSuccess) {
    // This success view remains the same
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Check Your Email</h2>
            <p className="text-gray-600 mt-2">We&apos;ve sent a verification link to <strong>{formData.email}</strong></p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-md"><p className="text-sm text-blue-800">Please click the verification link to activate your account.</p></div>
            {onToggleMode && (<Button variant="outline" className="w-full" onClick={onToggleMode}>Back to Sign In</Button>)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader><div className="text-center"><h2 className="text-2xl font-bold text-gray-900">Join Adams State Hub</h2><p className="text-gray-600">Create your account to access career resources</p></div></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Display Name" value={formData.displayName} onChange={handleChange('displayName')} required />
          <Input type="email" label="Email Address" value={formData.email} onChange={handleChange('email')} placeholder="your.email@adams.edu" required />
          <Input label="University" value={formData.university} onChange={handleChange('university')} required />

          <div className="space-y-2">
            <label htmlFor="major" className="block text-sm font-medium text-gray-700">Major</label>
            <select id="major" value={formData.major} onChange={handleChange('major')} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">Select your major</option>
              {SUPPORTED_MAJORS.map(major => (<option key={major} value={major}>{major}</option>))}
            </select>
          </div>

          <Input type="number" label="Graduation Year (Optional)" value={formData.graduationYear} onChange={handleChange('graduationYear')} placeholder="e.g., 2025" />
          <Input type="password" label="Password" value={formData.password} onChange={handleChange('password')} placeholder="At least 8 characters" required />
          <Input type="password" label="Confirm Password" value={formData.confirmPassword} onChange={handleChange('confirmPassword')} required />

          <div className="space-y-3 pt-2">
            <Button type="submit" className="w-full" loading={loading}>Create Account</Button>
            {onToggleMode && (
              <div className="text-center">
                <span className="text-sm text-gray-600">Already have an account? </span>
                <button type="button" onClick={onToggleMode} className="text-sm text-blue-600 hover:text-blue-800 underline">Sign in</button>
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}