'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/Card';
import { SUPPORTED_MAJORS } from '@/types';
import toast from 'react-hot-toast';
import { updateUserProfileAndMajor } from '@/components/channels/ChannelService';
import Image from 'next/image';
import { User as UserIcon, AlertTriangle } from 'lucide-react';
import { useSubChannels } from '@/hooks/useSubChannels';

export default function ProfileSetupPage() {
  const { user, loading: authLoading, handleDeleteAccount } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    displayName: '',
    major: '',
    subChannel: '',
    graduationYear: '',
    university: '',
  });
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch sub-channels dynamically based on selected major
  const { subChannels, loading: subChannelsLoading, hasSubChannels: majorHasSubChannels } = useSubChannels(formData.major);

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        major: user.major || '',
        subChannel: user.subChannel || '',
        graduationYear: user.profile?.graduationYear?.toString() || '',
        university: user.profile?.university || '',
      });
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
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
      toast.error('Display Name and Primary Major are required.');
      return;
    }

    // Validate sub-channel if major has sub-channels
    if (majorHasSubChannels && subChannels.length > 0 && !formData.subChannel) {
      toast.error('Please select a concentration for your major.');
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
    } catch (error: unknown) {
      toast.error(`Failed to update profile: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newValue = e.target.value;

    // If major changes, reset sub-channel
    if (field === 'major') {
      setFormData(prev => ({ ...prev, [field]: newValue, subChannel: '' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: newValue }));
    }
  };

  const onDelete = async () => {
    if (!window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) {
      return;
    }
    setIsDeleting(true);
    try {
      await handleDeleteAccount();
      router.push('/');
    } catch {
      // Error toast is handled in AuthContext
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading) return null;

  const currentAvatar = previewUrl || user?.profile?.avatar;

  return (
    <Card className="w-full md:max-w-lg md:mx-auto md:shadow-lg border-0 md:border rounded-none md:rounded-lg min-h-screen md:min-h-0">
      <CardHeader className="pt-8 md:pt-6">
        <h2 className="text-2xl font-bold text-center text-gray-900">Profile Settings</h2>
        <p className="text-sm text-center text-gray-600 mt-1">Manage your profile and majors</p>
      </CardHeader>
      <CardContent className="px-6 md:px-6">
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

          {/* Primary Major */}
          <div>
            <label htmlFor="major" className="block text-sm font-medium text-gray-700 mb-2">
              Primary Major <span className="text-red-500">*</span>
            </label>
            <select
              id="major"
              value={formData.major}
              onChange={handleChange('major')}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select your primary major</option>
              {SUPPORTED_MAJORS.map(major => (
                <option key={major} value={major}>{major}</option>
              ))}
            </select>
          </div>

          {/* Dynamic Sub-Channel/Concentration Selector */}
          {formData.major && majorHasSubChannels && (
            <div>
              <label htmlFor="subChannel" className="block text-sm font-medium text-gray-700 mb-2">
                {formData.major} Concentration <span className="text-red-500">*</span>
              </label>
              {subChannelsLoading ? (
                <div className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm items-center text-gray-500">
                  Loading concentrations...
                </div>
              ) : subChannels.length > 0 ? (
                <>
                  <select
                    id="subChannel"
                    value={formData.subChannel}
                    onChange={handleChange('subChannel')}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select your concentration</option>
                    {subChannels.map(subChannel => (
                      <option key={subChannel} value={subChannel}>{subChannel}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    This determines which resources you&apos;ll see in your major channel
                  </p>
                </>
              ) : (
                <div className="flex h-10 w-full rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm items-center text-yellow-700">
                  No concentrations available yet - contact your professor
                </div>
              )}
            </div>
          )}

          <Input
            type="number"
            label="Graduation Year (Optional)"
            value={formData.graduationYear}
            onChange={handleChange('graduationYear')}
            placeholder="e.g., 2025"
          />

          <Button type="submit" className="w-full" loading={loading}>
            Save Changes
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex-col items-start bg-red-50 border-t-2 border-red-200">
        <h3 className="text-lg font-semibold text-red-800 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Danger Zone
        </h3>
        <p className="text-sm text-red-600 mt-1 mb-4">
          Deleting your account is permanent and will remove all your data. This action cannot be undone.
        </p>
        <Button
          variant="secondary"
          className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
          onClick={onDelete}
          loading={isDeleting}
        >
          Delete My Account
        </Button>
      </CardFooter>
    </Card>
  );
}