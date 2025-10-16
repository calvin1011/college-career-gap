// src/app/dashboard/profile/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/Card';
import { Major, SUPPORTED_MAJORS } from '@/types';
import toast from 'react-hot-toast';
import { updateUserProfileAndMajor } from '@/components/channels/ChannelService';
import Image from 'next/image';
import { User as UserIcon } from 'lucide-react';

export default function ProfileSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    displayName: '',
    major: '',
    graduationYear: '',
    university: '',
  });
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        major: user.major || '',
        graduationYear: user.profile?.graduationYear?.toString() || '',
        university: user.profile?.university || '',
      });
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error('Image is too large. Max size is 2MB.');
        return;
      }
      setProfilePicFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.major || !formData.displayName) {
      toast.error('Display Name and Major are required.');
      return;
    }
    setLoading(true);
    try {
      const newChannel = await updateUserProfileAndMajor(user.uid, formData, profilePicFile);
      toast.success('Profile updated successfully!');
      if (newChannel?.slug) {
        router.push(`/dashboard/channels/${newChannel.slug}`);
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  if (authLoading) return null;

  const currentAvatar = previewUrl || user?.profile?.avatar;

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold text-center text-gray-900">Profile Settings</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-24 h-24">
              {currentAvatar ? (
                <Image
                  src={currentAvatar}
                  alt="Profile Preview"
                  layout="fill"
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                  <UserIcon className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/png, image/jpeg"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Change Picture
            </Button>
          </div>
          <Input label="Display Name" value={formData.displayName} onChange={handleChange('displayName')} required />
          <Input label="University" value={formData.university} onChange={handleChange('university')} required />
          <div>
            <label htmlFor="major" className="block text-sm font-medium text-gray-700 mb-2">Major</label>
            <select id="major" value={formData.major} onChange={handleChange('major')} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">Select your major</option>
              {SUPPORTED_MAJORS.map(major => (<option key={major} value={major}>{major}</option>))}
            </select>
          </div>
          <Input type="number" label="Graduation Year (Optional)" value={formData.graduationYear} onChange={handleChange('graduationYear')} placeholder="e.g., 2025" />
          <Button type="submit" className="w-full" loading={loading}>Save Changes</Button>
        </form>
      </CardContent>
    </Card>
  );
}