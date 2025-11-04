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
import { MessageStats } from '@/components/channels/MessageStats';
import { updateMessage } from '@/components/channels/ChannelService';
import { EditMessageModal } from '@/components/channels/EditMessageModal';
import { InviteModal } from '@/components/channels/InviteModal';
import { FieldValue, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { requestNotificationPermission, disableNotificationsForDevice } from '@/services/firebase/notifications';
import { TagBadge } from '@/components/channels/TagBadge';
import { useSubChannels } from '@/hooks/useSubChannels';
import { ExpirationBadge } from '@/components/channels/ExpirationBadge';
import Image from "next/image";
import { useMessageViewTracking } from '@/hooks/useMessageViewTracking';

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
  const { subChannels, hasSubChannels: majorHasSubChannels } = useSubChannels(channel?.name);

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
      // Only consider notifications enabled if the array exists AND has tokens in it
      setNotificationsEnabled(!!user.notificationTokens && user.notificationTokens.length > 0);
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
        // Use the new function to remove the token for THIS device
        await disableNotificationsForDevice(user.uid);
        setNotificationsEnabled(false);
        toast.success('Notifications disabled for this device');
      } else {
        // This part remains the same
        await requestNotificationPermission(user.uid);
        setNotificationsEnabled(true);
        toast.success('Notifications enabled for this device');
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      toast.error('Failed to update notification settings. Please try again.');
    }
  };

  const handleTogglePin = async (message: Message) => {
    setModerationLoading(message.id);
    try {
      await togglePinMessage(message.id, message.isPinned);
    } catch {
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
      } catch {
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
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!channel || !hasAccess) {
    return (
      <div className="flex items-center justify-center h-full">
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
    <div className="h-full flex flex-col bg-white">
      {/* Channel Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 truncate">{channel.name}</h1>
            <p className="text-xs md:text-sm text-gray-600 mb-2">{channel.description}</p>
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              <span className="flex items-center"><Users className="w-3 h-3 mr-1" />{channel.memberCount || 0} members</span>
              <span className="flex items-center"><MessageCircle className="w-3 h-3 mr-1" />{channel.messageCount || 0} resources</span>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1.5 ml-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-base md:text-lg font-bold text-blue-600">{channel.majorCode}</span>
            </div>

            {!isAdmin && (
              <button
                onClick={handleToggleNotifications}
                className={`
                  flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors
                  ${notificationsEnabled 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                `}
                title={notificationsEnabled ? 'Notifications enabled' : 'Notifications disabled'}
              >
                {notificationsEnabled ? (
                  <><Bell className="w-3 h-3" /><span className="hidden sm:inline">On</span></>
                ) : (
                  <><BellOff className="w-3 h-3" /><span className="hidden sm:inline">Off</span></>
                )}
              </button>
            )}

            <Link href="/dashboard/profile">
              <Button variant="outline" size="sm" className="text-xs h-7 px-2">
                <User className="w-3 h-3 mr-1" /> Change
              </Button>
            </Link>

            <Button onClick={() => setShowInviteModal(true)} size="sm" className="text-xs h-7 px-2">
              <Share2 className="w-3 h-3 mr-1" />
              <span className="hidden md:inline">Invite</span>
            </Button>
          </div>
        </div>

        {/* Sub-Channel Dropdown - Now inside header */}
        {channel && majorHasSubChannels && subChannels.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <label htmlFor="subChannel" className="text-xs md:text-sm font-medium text-gray-700">
              Concentration:
            </label>
            <select
              id="subChannel"
              value={user?.subChannel || ''}
              onChange={async (e) => {
                if (!user) return;
                const newSubChannel = e.target.value;
                try {
                  const userRef = doc(db, 'users', user.uid);
                  await updateDoc(userRef, {
                    subChannel: newSubChannel || null
                  });
                  toast.success(newSubChannel ? `Switched to ${newSubChannel}` : 'Viewing all resources');
                } catch (error) {
                  console.error('Error updating sub-channel:', error);
                  toast.error('Failed to switch concentration');
                }
              }}
              className="ml-4 flex-1 max-w-xs h-8 rounded-md border border-gray-300 bg-white px-3 py-1 text-xs md:text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All {channel.name} Resources</option>
              {subChannels.map((subChannel) => (
                <option key={subChannel} value={subChannel}>{subChannel}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3">
          {filteredMessages.length === 0 ? (
            <div className="flex items-center justify-center text-center py-12">
              <div>
                <Sparkles className="w-12 h-12 md:w-14 md:h-14 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base md:text-lg font-semibold text-gray-700 mb-1">
                  {user?.subChannel
                    ? `No ${user.subChannel} resources yet`
                    : `Welcome to ${channel.name}!`}
                </h3>
                <p className="text-sm text-gray-500">
                  {user?.subChannel
                    ? 'Check back soon for resources in this concentration.'
                    : 'No resources have been posted yet.'}
                </p>
              </div>
            </div>
          ) : (
            filteredMessages.map((message) => {
              const viewRef = useMessageViewTracking(message.id, user?.role as 'student' | 'admin');

              return (
                <div
                  key={message.id}
                  ref={viewRef}
                  className={`p-3 rounded-lg shadow-sm border-l-4 transition-colors ${message.isPinned ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200'}`}
                >
                  {message.isPinned && (
                    <div className="flex items-center mb-1.5 text-blue-600 text-xs font-medium">
                      <Sparkles className="w-3 h-3 mr-1" /> Pinned Resource
                    </div>
                  )}
                  {/* Sub-channel badge */}
                  {message.subChannel && (
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 mb-1.5">
                      {message.subChannel}
                    </div>
                  )}

                  {/* Expiration badge - shows "Expires in X days" */}
                  <div className="mb-1.5">
                    <ExpirationBadge message={message} />
                  </div>

                  {message.metadata?.tags && message.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {message.metadata.tags
                        .filter((tag) => tag !== 'internship' && tag !== 'full-time') // Hide expiring tags
                        .map((tag) => (
                          <TagBadge key={tag} tag={tag as MessageTag} />
                        ))}
                    </div>
                  )}
                  <div className="flex items-start space-x-2">
                    <div className="relative w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {message.authorId === 'system' ? (
                        <span className="text-xs font-semibold text-blue-600">🏫</span>
                      ) : message.authorAvatar ? (
                        <Image
                          src={message.authorAvatar}
                          alt={message.authorDisplayName || 'avatar'}
                          layout="fill"
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-blue-600">
                          {message.authorDisplayName?.[0] || 'P'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900">
                            {message.authorId === 'system'
                              ? 'Adams State Hub'
                              : message.authorDisplayName || 'Professor'}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            {formatTimestamp(message.createdAt)}
                          </span>
                          {message.isEdited && (
                            <span className="text-xs text-gray-400 ml-1">(edited)</span>
                          )}
                        </div>
                        {isAdmin && (
                          <div className="flex items-center space-x-0.5 ml-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingMessage(message)}
                              className="p-1 h-7 w-7"
                            >
                              <Edit className="w-3.5 h-3.5 text-gray-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTogglePin(message)}
                              disabled={moderationLoading === message.id}
                              className="p-1 h-7 w-7"
                            >
                              <Pin className={`w-3.5 h-3.5 ${message.isPinned ? 'text-blue-600' : 'text-gray-500'}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMessage(message)}
                              disabled={moderationLoading === message.id}
                              className="p-1 h-7 w-7"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <MessageContentRenderer
                        content={message.content}
                        messageId={message.id}
                      />

                      {message.metadata?.links?.[0] && (
                        <LinkPreviewCard
                          preview={message.metadata.links[0]}
                          messageId={message.id}
                        />
                      )}

                      {/* Wrapper for reactions and stats */}
                      <div className="flex items-center justify-between pt-2">
                        {user && (
                          <ReactionPanel message={message} user={user} />
                        )}
                        <MessageStats message={message} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Message Composer for Admins */}
      {isAdmin && user && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-white">
          <MessageComposer
            channelId={channel.id}
            channelName={channel.name}
            // MODIFIED: Pass the author object
            author={{
              uid: user.uid,
              displayName: user.displayName,
              avatar: user.profile?.avatar
            }}
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