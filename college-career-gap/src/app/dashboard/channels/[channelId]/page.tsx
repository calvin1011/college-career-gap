'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { findChannelBySlug, leaveChannel } from '@/components/channels/ChannelService';
import { Channel, Message } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import {Users, Lock, MessageCircle, Sparkles, LogOut, User} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMessages } from '@/hooks/useMessages';
import { MessageComposer } from '@/components/channels/MessageComposer';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import Link from "next/link";

export default function ChannelPage() {
  const params = useParams();
  const channelId = params.channelId as string;
  const { user } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loadingChannel, setLoadingChannel] = useState(true);
  const [leavingChannel, setLeavingChannel] = useState(false);
  const { messages, loading: loadingMessages } = useMessages(channel?.id || '');
  const router = useRouter();

  useEffect(() => {
    const fetchChannel = async () => {
      if (!user) {
        setLoadingChannel(false);
        return;
      }
      try {
        const foundChannel = await findChannelBySlug(channelId);
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
  // use the channelId variable in the dependency array
  }, [channelId, user]);

  const handleLeaveChannel = async () => {
    if (!user || !channel) return;

    if (confirm("Are you sure you want to leave this channel? You'll need to update your major in profile settings.")) {
      setLeavingChannel(true);
      try {
        await leaveChannel(channel.id, user.uid);
        router.push('/dashboard/profile');
      } catch (error) {
        console.error('Error leaving channel:', error);
        setLeavingChannel(false);
      }
    }
  };

  const loading = loadingChannel || loadingMessages;
  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading channel...</p>
        </div>
      </div>
    );
  }

  // Check if the user is a member of the channel
  const isMember = user?.joinedChannels.includes(channel?.id || '');

  if (!channel || !isMember) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md mx-auto text-center p-8">
          <CardContent>
            <div className="text-red-500 mb-4">
              <Lock size={48} className="mx-auto" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You must be a member of this channel to view its content.
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go to Dashboard
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleMessagePosted = (newMessage: Message) => {
    // The useMessages hook will automatically update with real-time data
    // This is just for optimistic updates if needed
  };

  return (
    <div className="container mx-auto py-8 flex flex-col h-[calc(100vh-64px)]">
      {/* Channel Header */}
      <div className="flex items-center justify-between mb-6 bg-white p-6 rounded-lg shadow-sm">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{channel.name}</h1>
          <p className="text-gray-600">{channel.description}</p>

          {/* Welcome message for newly joined users */}
          <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {channel.memberCount || 0} members
            </span>
            <span className="flex items-center">
              <MessageCircle className="w-4 h-4 mr-1" />
              {channel.messageCount || 0} resources shared
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-3">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-blue-600">
              {channel.majorCode}
            </span>
          </div>
          {!isAdmin && (
            <Link href="/dashboard/profile">
              <Button
                variant="outline"
                size="sm"
                className="text-gray-700 hover:text-gray-800 hover:bg-gray-100"
              >
                <User className="w-4 h-4 mr-1" />
                Change Major
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="bg-white rounded-lg shadow-lg flex-grow overflow-hidden flex flex-col">
        <div className="flex-grow overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex-grow flex items-center justify-center text-center py-12">
              <div>
                <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Welcome to {channel.name}!
                </h3>
                <p className="text-gray-500 mb-4">
                  This channel is where professors share career resources, job opportunities,
                  and industry insights for {channel.name} students.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg max-w-md mx-auto">
                  <p className="text-sm text-blue-800">
                    <strong>What you'll find here:</strong><br/>
                    • Industry podcasts and articles<br/>
                    • Job and internship opportunities<br/>
                    • Networking tips and events<br/>
                    • Graduate school guidance
                  </p>
                </div>
                {!isAdmin && (
                  <p className="text-sm text-gray-400 mt-4">
                    Only professors can post messages. Students can react and bookmark resources.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages
                .sort((a, b) => {
                  // Pin pinned messages to top, then sort by date
                  if (a.isPinned && !b.isPinned) return -1;
                  if (!a.isPinned && b.isPinned) return 1;

                  const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
                  const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
                  return bTime - aTime; // Newest first
                })
                .map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg shadow-sm border-l-4 ${
                      message.isPinned 
                        ? 'bg-blue-50 border-blue-500' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {message.isPinned && (
                      <div className="flex items-center mb-2 text-blue-600 text-sm font-medium">
                        <Sparkles className="w-4 h-4 mr-1" />
                        Pinned Resource
                      </div>
                    )}

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-blue-600">
                          {message.authorId === 'system' ? '🏫' : 'P'}
                        </span>
                      </div>

                      <div className="flex-grow">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {message.authorId === 'system' ? 'Adams State Hub' : 'Professor'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {message.createdAt instanceof Date
                              ? message.createdAt.toLocaleDateString()
                              : 'Recently'}
                          </span>
                        </div>

                        <p className="text-gray-800 leading-relaxed">{message.content}</p>

                        {/* Reaction buttons would go here */}
                        <div className="mt-3 flex items-center space-x-4">
                          <button className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
                            👍 Like
                          </button>
                          <button className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
                            🔖 Bookmark
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Composer for Admins */}
      {isAdmin && (
        <MessageComposer
          channelId={channel.id}
          userId={user.uid}
          isAdmin={isAdmin}
          onMessagePosted={handleMessagePosted}
        />
      )}

      {/* Student Info Footer */}
      {!isAdmin && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-sm text-gray-600">
            💡 <strong>Tip:</strong> Bookmark useful resources and check back regularly for new opportunities!
          </p>
        </div>
      )}
    </div>
  );
}