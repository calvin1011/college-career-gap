'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { SUPPORTED_MAJORS } from '@/types';
import toast from 'react-hot-toast';
import { updateUserProfile } from '@/components/channels/ChannelService';

export default function ProfileSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    displayName: '',
    major: '',
    graduationYear: '',
  });
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        major: user.major || '',
        graduationYear: user.profile?.graduationYear?.toString() || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to update your profile.');
      return;
    }
    if (!formData.major || !formData.displayName) {
        toast.error('Please fill out all required fields.');
        return;
    }

    setLoading(true);
    try {
      await updateUserProfile(user.uid, formData, profilePic);
      toast.success('Profile updated successfully!');
      // Manually reload to ensure AuthContext picks up the new user data
      window.location.href = '/dashboard';
    } catch (error) {
      toast.error('Failed to update profile.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePic(e.target.files[0]);
    }
  };

  if (authLoading) {
      return null; // Avoid flicker
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
          <p className="text-gray-600">Tell us a bit more about yourself to get started.</p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {profilePic ? (
                <img src={URL.createObjectURL(profilePic)} alt="Profile preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-500">Avatar</span>
              )}
            </div>
            <Input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              className="flex-1"
            />
          </div>

          <Input
            label="Display Name"
            value={formData.displayName}
            onChange={handleChange('displayName')}
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
          </div>

          <Input
            type="number"
            label="Graduation Year (Optional)"
            value={formData.graduationYear}
            onChange={handleChange('graduationYear')}
            placeholder="e.g., 2025"
          />

          <Button type="submit" className="w-full" loading={loading}>
            Save and Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}