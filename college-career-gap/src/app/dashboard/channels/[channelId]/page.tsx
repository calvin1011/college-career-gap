'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { findChannelBySlug } from '@/components/channels/ChannelService';
import { Channel, Message } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Users, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMessages } from '@/hooks/useMessages';

interface ChannelPageProps {
  params: {
    channelId: string;
  };
}

export default function ChannelPage({ params }: ChannelPageProps) {
  const { user } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loadingChannel, setLoadingChannel] = useState(true);
  const { messages, loading: loadingMessages } = useMessages(channel?.id || '');

  useEffect(() => {
    const fetchChannel = async () => {
      if (!user) {
        setLoadingChannel(false);
        return;
      }
      try {
        const foundChannel = await findChannelBySlug(params.channelId);
        if (foundChannel) {
          setChannel(foundChannel);
        } else {
          toast.error('Channel not found.');
        }
      } catch (error) {
        console.error('Error fetching channel:', error);
        toast.error('Failed to load channel.');
      } finally {
        setLoadingChannel(false);
      }
    };
    fetchChannel();
  }, [params.channelId, user]);

  const loading = loadingChannel || loadingMessages;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if the user is a member of the channel
  const isMember = user?.joinedChannels.includes(channel?.id || '');

  if (!channel || !isMember) {
    // If the channel doesn't exist or the user is not a member,
    // we can either show a "not found" page or a restricted access message.
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md mx-auto text-center p-8">
          <CardContent>
            <div className="text-red-500 mb-4">
              <Lock size={48} className="mx-auto" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600">You must be a member of this channel to view its content.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">{channel.name}</h1>
          <p className="text-gray-600">{channel.description}</p>
        </div>
        <div className="flex items-center text-gray-500">
          <Users className="w-5 h-5 mr-2" />
          <span>{channel.members.length} members</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg min-h-[500px] flex flex-col-reverse p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex-grow flex items-center justify-center">
            <p className="text-gray-400">No messages yet. Be the first to post!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <p className="text-gray-800">{message.content}</p>
              {/* This is a basic message display. We'll improve this later. */}
              <span className="text-sm text-gray-500 block text-right">
                {message.createdAt instanceof Date ? message.createdAt.toLocaleTimeString() : '...'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
