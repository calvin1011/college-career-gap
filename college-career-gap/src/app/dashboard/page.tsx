'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChannel } from '@/hooks/useChannel';
import { Channel } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { joinChannel } from '@/components/channels/ChannelService';
import { Building2, GraduationCap, Users } from 'lucide-react';
import { getAnalytics, logEvent } from 'firebase/analytics';
import app from '@/services/firebase/config';
import toast from 'react-hot-toast';

// Initialize analytics
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default function DashboardPage() {
  const { user, firebaseUser } = useAuth();
  const { channels, loadingChannels } = useChannel();
  const [joining, setJoining] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (analytics) {
      logEvent(analytics, 'view_dashboard');
    }
  }, []);

  const handleJoinChannel = async (channel: Channel) => {
    if (!firebaseUser || !user) return;
    setJoining(true);
    await joinChannel(channel.id, user.uid);
    setJoining(false);
  };

  const handleRedirect = (channel: Channel) => {
    setRedirecting(true);
    // In a real app, you would redirect to the channel page
    // For this example, we'll just show a message.
    toast.success(`Redirecting to ${channel.name} channel...`);
    // Example: router.push(`/dashboard/channels/${channel.slug}`);
    setTimeout(() => setRedirecting(false), 2000);
  };

  if (loadingChannels) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const userJoinedChannels = user?.joinedChannels || [];

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome, {user?.displayName || 'Student'}!</h1>
      <p className="text-gray-600 mb-8">
        Your academic major is <span className="font-semibold text-blue-600">{user?.major || 'not set'}</span>. You can join your major&#39;s group to get career guidance.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels.map((channel) => {
          const isUserMajorChannel = user?.major === channel.name;
          const isMember = userJoinedChannels.includes(channel.id);
          const channelStyle = isUserMajorChannel ? "ring-2 ring-blue-500 ring-offset-2" : "";

          return (
            <Card key={channel.id} className={`shadow-lg transition-transform hover:scale-[1.02] ${channelStyle}`}>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">{channel.name}</h3>
                    <p className="text-sm text-gray-500">Channel Code: {channel.majorCode}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{channel.description}</p>
                <div className="flex items-center space-x-4 text-gray-500 text-sm mb-4">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" /> {channel.members.length} members
                  </span>
                </div>
                {isMember ? (
                  <Button
                    onClick={() => handleRedirect(channel)}
                    loading={redirecting}
                    className="w-full"
                  >
                    Go to Channel
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleJoinChannel(channel)}
                    loading={joining}
                    className="w-full"
                  >
                    Join Group
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
