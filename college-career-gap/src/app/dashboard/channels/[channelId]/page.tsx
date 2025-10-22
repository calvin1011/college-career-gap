'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { findChannelBySlug, togglePinMessage, deleteMessage } from '@/components/channels/ChannelService';
import { Channel, Message, MessageTag, hasSubChannels } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Users, Lock, MessageCircle, Sparkles, User, Pin, Trash2, Edit, Share2, Bell, BellOff } from 'lucide-react';
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
import { FieldValue, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { requestNotificationPermission } from '@/services/firebase/notifications';
import { TagBadge } from '@/components/channels/TagBadge';
import { SubChannelDropdown } from '@/components/channels/SubChannelDropdown';

export default function ChannelPage() {
  const params = useParams();
  const channelId = params.channelId as string;
  const { user } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loadingChannel, setLoadingChannel] = useState(true);
  const [moderationLoading, setModerationLoading] = useState<string | null>(null);
  const { messages, loading: loadingMessages } = useMessages(channel?.id || '');
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

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

  useEffect(() => {
    if (user) {
      setNotificationsEnabled(!!user.notificationToken);
    }
  }, [user]);

  const filteredMessages = useMemo(() => {
    if (!user || !channel) return messages;

    // If this major doesn't have sub-channels, show all messages
    if (!hasSubChannels(channel.name)) {
      return messages;
    }

    // BOTH ADMINS AND STUDENTS: Same filtering logic
    // If NO sub-channel selected (viewing "All Business Resources"), show ALL messages
    if (!user.subChannel) {
      return messages;
    }

    // If a SPECIFIC sub-channel is selected (e.g., "Accounting")
    // Show ONLY messages tagged for that specific sub-channel
    // Do NOT show general messages
    return messages.filter(message =>
      message.subChannel === user.subChannel
    );
  }, [messages, user, channel]);


  const handleToggleNotifications = async () => {
    if (!user) return;

    try {
      if (notificationsEnabled) {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
          notificationToken: null,
        });
        setNotificationsEnabled(false);
        toast.success('Notifications disabled');
      } else {
        await requestNotificationPermission(user.uid);
        setNotificationsEnabled(true);
        toast.success('Notifications enabled');
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      toast.error('Failed to update notifications');
    }
  };

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
  const hasAccess = isMember;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!channel || !hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md mx-auto text-center p-8">
          <CardContent>
            <Lock size={48} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You are not a member of this channel.</p>
            <a href="/dashboard" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md">Go to Dashboard</a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleUpdateMessage = async (
    messageId: string,
    newContent: string,
    tags: MessageTag[],
    subChannel?: string
  ) => {
    await updateMessage(messageId, newContent, tags, subChannel);
  };

  const formatTimestamp = (timestamp: Date | Timestamp | FieldValue): string => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleString();
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString();
    }
    return 'Just now';
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Channel Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-4 md:px-6 md:py-6 md:rounded-lg md:shadow-sm md:mb-4 md:mx-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2 truncate">{channel.name}</h1>
            <p className="text-sm md:text-base text-gray-600 mb-3">{channel.description}</p>
            <div className="flex items-center space-x-3 md:space-x-4 text-xs md:text-sm text-gray-500">
              <span className="flex items-center"><Users className="w-3 h-3 md:w-4 md:h-4 mr-1" />{channel.memberCount || 0} members</span>
              <span className="flex items-center"><MessageCircle className="w-3 h-3 md:w-4 md:h-4 mr-1" />{channel.messageCount || 0} resources</span>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2 md:space-y-3 ml-3">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-lg md:text-2xl font-bold text-blue-600">{channel.majorCode}</span>
            </div>

            {!isAdmin && (
              <button
                onClick={handleToggleNotifications}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-colors
                  ${notificationsEnabled 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                `}
                title={notificationsEnabled ? 'Notifications enabled' : 'Notifications disabled'}
              >
                {notificationsEnabled ? (
                  <><Bell className="w-3.5 h-3.5 md:w-4 md:h-4" /><span className="hidden sm:inline">Notifications</span></>
                ) : (
                  <><BellOff className="w-3.5 h-3.5 md:w-4 md:h-4" /><span className="hidden sm:inline">Notifications</span></>
                )}
              </button>
            )}

            <Link href="/dashboard/profile">
              <Button variant="outline" size="sm" className="text-xs md:text-sm whitespace-nowrap">
                <User className="w-3 h-3 md:w-4 md:h-4 mr-1" /> Change Major
              </Button>
            </Link>

            <Button onClick={() => setShowInviteModal(true)} size="sm" className="text-xs md:text-sm whitespace-nowrap">
              <Share2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Invite</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Sub-Channel Dropdown */}
      {channel && (
        <SubChannelDropdown currentMajor={channel.name} />
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white md:rounded-lg md:shadow-lg">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="flex items-center justify-center text-center py-12">
              <div>
                <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-2">
                  {user?.subChannel
                    ? `No ${user.subChannel} resources yet`
                    : `Welcome to ${channel.name}!`}
                </h3>
                <p className="text-sm md:text-base text-gray-500">
                  {user?.subChannel
                    ? 'Check back soon for resources in this concentration.'
                    : 'No resources have been posted yet.'}
                </p>
              </div>
            </div>
          ) : (
            filteredMessages.map((message) => (
              <div key={message.id} className={`p-3 md:p-4 rounded-lg shadow-sm border-l-4 transition-colors ${message.isPinned ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-200'}`}>
                {message.isPinned && (
                  <div className="flex items-center mb-2 text-blue-600 text-xs md:text-sm font-medium">
                    <Sparkles className="w-3 h-3 md:w-4 md:h-4 mr-1" /> Pinned Resource
                  </div>
                )}
                {/* NEW: Show sub-channel badge if message is tagged */}
                {message.subChannel && (
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 mb-2">
                    {message.subChannel}
                  </div>
                )}
                <div className="flex items-start space-x-2 md:space-x-3">
                  <div className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs md:text-sm font-semibold text-blue-600">
                      {message.authorId === 'system' ? '🏫' : 'P'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm md:text-base font-medium text-gray-900">
                          {message.authorId === 'system' ? 'Adams State Hub' : 'Professor'}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {formatTimestamp(message.createdAt)}
                        </span>
                        {message.isEdited && (
                          <span className="text-xs text-gray-400 ml-2">(edited)</span>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMessage(message)}
                            className="p-1"
                          >
                            <Edit className="w-4 h-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePin(message)}
                            disabled={moderationLoading === message.id}
                            className="p-1"
                          >
                            <Pin className={`w-4 h-4 ${message.isPinned ? 'text-blue-600' : 'text-gray-500'}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMessage(message)}
                            disabled={moderationLoading === message.id}
                            className="p-1"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {message.metadata?.tags && message.metadata.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {message.metadata.tags.map((tag) => (
                          <TagBadge key={tag} tag={tag as MessageTag} />
                        ))}
                      </div>
                    )}

                    <MessageContentRenderer content={message.content} />

                    {message.metadata?.links?.[0] && (
                      <LinkPreviewCard preview={message.metadata.links[0]} />
                    )}
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
        <div className="flex-shrink-0 p-4 md:p-0 md:mt-4">
          <MessageComposer
            channelId={channel.id}
            channelName={channel.name}
            userId={user.uid}
            isAdmin={isAdmin}
            onMessagePosted={() => {}}
          />
        </div>
      )}

      {showInviteModal && channel && (
        <InviteModal
          channel={channel}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {editingMessage && (
        <EditMessageModal
          message={editingMessage}
          channelName={channel.name}
          onClose={() => setEditingMessage(null)}
          onSave={handleUpdateMessage}
        />
      )}
    </div>
  );
}