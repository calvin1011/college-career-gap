'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChannel } from '@/hooks/useChannel';
import { Channel } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { joinChannel } from '@/components/channels/ChannelService';
import {
  Building2,
  Users,
  Briefcase,
  Code,
  Dna,
  FlaskConical,
  Brain,
  HeartPulse
} from 'lucide-react';
import { getAnalytics, logEvent } from 'firebase/analytics';
import app from '@/services/firebase/config';
import toast from 'react-hot-toast';
import { useRouter } from "next/navigation";
import { cn } from '@/utils/cn';

// Initialize analytics
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Helper to get an icon based on the major name
const MajorIcon = ({ majorName }: { majorName: string }) => {
  switch (majorName) {
    case 'Business':
      return <Briefcase className="w-6 h-6 text-brand-blue" />;
    case 'Computer Science':
      return <Code className="w-6 h-6 text-brand-blue" />;
    case 'Biology':
      return <Dna className="w-6 h-6 text-brand-blue" />;
    case 'Chemistry':
      return <FlaskConical className="w-6 h-6 text-brand-blue" />;
    case 'Psychology':
      return <Brain className="w-6 h-6 text-brand-blue" />;
    case 'Kinesiology':
      return <HeartPulse className="w-6 h-6 text-brand-blue" />;
    default:
      return <Building2 className="w-6 h-6 text-brand-blue" />;
  }
};

export default function DashboardPage() {
  const { user, firebaseUser } = useAuth();
  const { channels, loadingChannels } = useChannel();
  const [joining, setJoining] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();

  // Log analytics event
  useEffect(() => {
    if (analytics) {
      logEvent(analytics, 'view_dashboard');
    }
  }, []);

  // Auto-redirect to major channel
  useEffect(() => {
    // Only run if we have user data and channels have loaded
    if (user?.major && !loadingChannels && channels.length > 0) {
      const userMajorChannel = channels.find(channel => channel.name === user.major);
      if (userMajorChannel) {
        const isUserMember = user.joinedChannels.includes(userMajorChannel.id);
        // If user is already a member of their major channel, redirect them there
        if (isUserMember) {
          router.push(`/dashboard/channels/${userMajorChannel.slug}`);
        }
      }
    }
  }, [user, channels, loadingChannels, router]);

  const handleJoinChannel = async (channel: Channel) => {
    if (!firebaseUser || !user) return;
    setJoining(true);
    await joinChannel(channel.id, user.uid);
    // Redirect user to their channel after joining
    router.push(`/dashboard/channels/${channel.slug}`);
    setJoining(false);
  };

  const handleRedirect = (channel: Channel) => {
    setRedirecting(true);
    router.push(`/dashboard/channels/${channel.slug}`);
  };

  if (loadingChannels) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filter channels to only show the user's major
  const userMajorChannels = channels.filter(channel => channel.name === user?.major);
  const userJoinedChannels = user?.joinedChannels || [];

  // If no channels match the user's major (shouldn't happen, but just in case)
  if (userMajorChannels.length === 0) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-4xl font-bold text-brand-slate-800 mb-4">
          Welcome, {user?.displayName || 'Student'}!
        </h1>
        <p className="text-xl text-brand-slate-700 mb-8">
          We couldn't find a channel for your major: <span className="font-semibold text-brand-blue">{user?.major || 'Not Set'}</span>.
        </p>
        <Button onClick={() => router.push('/dashboard/profile')}>
          Update Profile
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Updated Header Section */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-brand-slate-800 mb-2">
          Welcome, {user?.displayName || 'Student'}!
        </h1>
        <p className="text-lg text-brand-slate-700">
          Your major is <span className="font-semibold text-brand-blue">{user?.major || 'Not Set'}</span>. Here is your major's resource channel.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        {userMajorChannels.map((channel) => {
          const isMember = userJoinedChannels.includes(channel.id);

          return (
            <Card
              key={channel.id}
              className="bg-blue-50 border-2 border-brand-blue shadow-lg rounded-xl transition-all hover:shadow-xl"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-brand-slate-900">{channel.name}</h3>
                    <p className="text-sm text-gray-500">Major Code: {channel.majorCode}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MajorIcon majorName={channel.name} />
                  </div>
                </div>
                <div className="mt-2 text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full inline-block">
                  Your Major Channel
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col">
                <p className="text-brand-slate-700 mb-4">{channel.description}</p>
                <div className="flex items-center space-x-4 text-brand-slate-700 text-sm mb-6">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1.5" /> {channel.members.length} members
                  </span>
                </div>
                {isMember ? (
                  <Button
                    onClick={() => handleRedirect(channel)}
                    loading={redirecting}
                    className="w-full mt-auto"
                  >
                    Go to Channel
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleJoinChannel(channel)}
                    loading={joining}
                    className="w-full mt-auto"
                    variant="primary"
                  >
                    Join Channel
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}