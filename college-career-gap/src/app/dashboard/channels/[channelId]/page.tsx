'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { findChannelBySlug, togglePinMessage, deleteMessage } from '@/components/channels/ChannelService';
import { Channel, Message } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Users, Lock, MessageCircle, Sparkles, User, Pin, Trash2, Edit, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMessages } from '@/hooks/useMessages';
import { MessageComposer } from '@/components/channels/MessageComposer';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import Link from "next/link";
import { ReactionPanel } from '@/components/channels/ReactionPanel';
import { MessageContentRenderer } from '@/components/channels/MessageContentRenderer';
import { LinkPreviewCard } from '@/components/channels/LinkPreviewCard';
import { updateMessage } from '@/components/channels/ChannelService';
import { EditMessageModal } from '@/components/channels/EditMessageModal';
import { InviteModal } from '@/components/channels/InviteModal';
import { FieldValue, Timestamp } from 'firebase/firestore';

export default function ChannelPage() {
  const params = useParams();
  const channelId = params.channelId as string;
  const { user } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loadingChannel, setLoadingChannel] = useState(true);
  const [moderationLoading, setModerationLoading] = useState<string | null>(null); // To track loading state for specific messages
  const { messages, loading: loadingMessages } = useMessages(channel?.id || '');
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    const fetchChannel = async () => {
      if (!channelId) return;
      try {
        const foundChannel = await findChannelBySlug(channelId);
        setChannel(foundChannel);
      } catch {
        toast.error('Failed to load channel.');
      } finally {
        setLoadingChannel(false);
      }
    };
    fetchChannel();
  }, [channelId]);

  const handleTogglePin = async (message: Message) => {
    setModerationLoading(message.id);
    try {
      await togglePinMessage(message.id, message.isPinned);
    } catch (error) {
      // Error toast is handled in the service
    } finally {
      setModerationLoading(null);
    }
  };

  const handleDeleteMessage = async (message: Message) => {
    if (window.confirm("Are you sure you want to permanently delete this message?")) {
      setModerationLoading(message.id);
      try {
        await deleteMessage(channel!.id, message.id);
      } catch (error) {
        // Error toast is handled in the service
      } finally {
        setModerationLoading(null);
      }
    }
  };

  const loading = loadingChannel || loadingMessages;
  const isAdmin = user?.role === 'admin';
  const isMember = user?.joinedChannels.includes(channel?.id || '');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!channel || !isMember) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md mx-auto text-center p-8"><CardContent>
          <Lock size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You are not a member of this channel.</p>
          <a href="/dashboard" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md">Go to Dashboard</a>
        </CardContent></Card>
      </div>
    );
  }

  const handleUpdateMessage = async (messageId: string, newContent: string) => {
    await updateMessage(messageId, newContent);
  };

  const formatTimestamp = (timestamp: Date | Timestamp | FieldValue): string => {
    // Check if it's a Firestore Timestamp object
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleString();
    }
    // Check if it's already a JavaScript Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString();
    }
    // Provide a fallback for FieldValue (like serverTimestamp) or other cases
    return 'Just now';
  };

  return (
    <div className="md:-my-8 md:-mx-8">
      <div className="container mx-auto py-8 px-6 md:px-8 flex flex-col md:h-[calc(100vh-80px)]">
        {/* Channel Header */}
        <div className="flex-shrink-0 flex items-center justify-between mb-6 bg-white p-6 rounded-lg shadow-sm">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{channel.name}</h1>
            <p className="text-gray-600">{channel.description}</p>
            <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center"><Users className="w-4 h-4 mr-1" />{channel.memberCount || 0} members</span>
              <span className="flex items-center"><MessageCircle className="w-4 h-4 mr-1" />{channel.messageCount || 0} resources shared</span>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-3">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">{channel.majorCode}</span>
            </div>
            <Link href="/dashboard/profile">
              <Button variant="outline" size="sm" className="text-gray-700 hover:text-gray-800 hover:bg-gray-100">
                <User className="w-4 h-4 mr-1" /> Change Major
              </Button>
            </Link>
            {isAdmin && (
              <Button onClick={() => setShowInviteModal(true)} size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Invite Students
              </Button>
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
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Welcome to {channel.name}!</h3>
                  <p className="text-gray-500">No resources have been posted yet.</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`p-4 rounded-lg shadow-sm border-l-4 transition-colors ${message.isPinned ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-200'}`}>
                  {message.isPinned && (<div className="flex items-center mb-2 text-blue-600 text-sm font-medium"><Sparkles className="w-4 h-4 mr-1" /> Pinned Resource</div>)}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-blue-600">{message.authorId === 'system' ? '🏫' : 'P'}</span>
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900">{message.authorId === 'system' ? 'Adams State Hub' : 'Professor'}</span>
                          <span className="text-xs text-gray-500 ml-2">{formatTimestamp(message.createdAt)}</span>
                          {message.isEdited && <span className="text-xs text-gray-400 ml-2">(edited)</span>}
                        </div>
                        {isAdmin && (
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingMessage(message)}>
                              <Edit className="w-4 h-4 text-gray-500" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleTogglePin(message)} disabled={moderationLoading === message.id}>
                              <Pin className={`w-4 h-4 ${message.isPinned ? 'text-blue-600' : 'text-gray-500'}`} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteMessage(message)} disabled={moderationLoading === message.id}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <MessageContentRenderer content={message.content} />

                      {/* link preview */}
                      {message.metadata?.links?.[0] && (
                        <LinkPreviewCard preview={message.metadata.links[0]} />
                      )}
                      {/* Reaction system */}
                      {user && (
                        <ReactionPanel message={message} user={user} />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message Composer for Admins */}
        {isAdmin && user && (
          <div className="flex-shrink-0">
            <MessageComposer channelId={channel.id} userId={user.uid} isAdmin={isAdmin} onMessagePosted={() => {}} />
          </div>
        )}

        {isAdmin && showInviteModal && channel && (
          <InviteModal
            channel={channel}
            onClose={() => setShowInviteModal(false)}
          />
        )}

        {editingMessage && (
          <EditMessageModal
            message={editingMessage}
            onClose={() => setEditingMessage(null)}
            onSave={handleUpdateMessage}
          />
        )}
      </div>
    </div>
  );
}