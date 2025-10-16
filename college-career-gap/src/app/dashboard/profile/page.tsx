'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/Card';
import { Major, SUPPORTED_MAJORS } from '@/types';
import toast from 'react-hot-toast';
// --- FIX IS HERE: Import the new function ---
import { updateUserProfileAndMajor } from '@/components/channels/ChannelService';

export default function ProfileSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    displayName: '',
    major: '',
    graduationYear: '',
    university: '',
  });
  const [loading, setLoading] = useState(false);
  const [isChangingMajor, setIsChangingMajor] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        major: user.major || '',
        graduationYear: user.profile?.graduationYear?.toString() || '',
        university: user.profile?.university || '',
      });
      if (user.major && user.joinedChannels.length === 0) {
        setIsChangingMajor(true);
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to update your profile.');
      return;
    }
    if (!formData.major || !formData.displayName) {
      toast.error('Display Name and Major are required.');
      return;
    }

    setLoading(true);

    try {
      const previousMajor = user.major;
      const newMajor = formData.major;

      // --- FIX IS HERE: Call the new function ---
      const newChannel = await updateUserProfileAndMajor(user.uid, formData);

      if (previousMajor && previousMajor !== newMajor) {
        toast.success(`Successfully changed major to ${newMajor}!`);
      } else {
        toast.success('Profile updated successfully!');
      }

      if (newChannel?.slug) {
        router.push(`/dashboard/channels/${newChannel.slug}`);
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  if (authLoading) {
    return null;
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <div className="text-center">
          {isChangingMajor ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900">Change Your Major</h2>
              <p className="text-gray-600">Select your new major to access relevant resources</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
              <p className="text-gray-600">Tell us a bit more about yourself to get started.</p>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Display Name"
            value={formData.displayName}
            onChange={handleChange('displayName')}
            required
          />

          <Input
            label="University"
            value={formData.university}
            onChange={handleChange('university')}
            required
          />

          <div className="space-y-2">
            <label htmlFor="major" className="block text-sm font-medium text-gray-700">Major</label>
            <select
              id="major"
              value={formData.major}
              onChange={handleChange('major')}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select your major</option>
              {SUPPORTED_MAJORS.map(major => (
                <option key={major} value={major}>{major}</option>
              ))}
            </select>
            {isChangingMajor && (
              <p className="text-sm text-blue-600 mt-1">
                You'll be added to your new major's channel automatically.
              </p>
            )}
          </div>

          <Input
            type="number"
            label="Graduation Year (Optional)"
            value={formData.graduationYear}
            onChange={handleChange('graduationYear')}
            placeholder="e.g., 2025"
          />

          <Button type="submit" className="w-full" loading={loading}>
            {isChangingMajor ? 'Save & Join New Channel' : 'Save and Continue'}
          </Button>
        </form>
      </CardContent>
      {isChangingMajor && (
        <CardFooter className="bg-gray-50 border-t border-gray-200 text-center text-sm text-gray-500 py-4">
          Changing your major will remove you from your current channel and add you to your new major's channel.
        </CardFooter>
      )}
    </Card>
  );
}