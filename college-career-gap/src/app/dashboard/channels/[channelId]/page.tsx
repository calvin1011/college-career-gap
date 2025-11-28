'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { findChannelBySlug, togglePinMessage, deleteMessage } from '@/components/channels/ChannelService';
import { Channel, Message, MessageTag, hasSubChannels } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Users, Lock, MessageCircle, Sparkles, User, Share2, Bell, BellOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMessages } from '@/hooks/useMessages';
import { MessageComposer } from '@/components/channels/MessageComposer';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import Link from "next/link";
import { updateMessage } from '@/components/channels/ChannelService';
import { EditMessageModal } from '@/components/channels/EditMessageModal';
import { InviteModal } from '@/components/channels/InviteModal';
import { FieldValue, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { requestNotificationPermission, disableNotificationsForDevice } from '@/services/firebase/notifications';
import { useSubChannels } from '@/hooks/useSubChannels';
import { MessageItem } from '@/components/channels/MessageItem';
import { MajorTabSwitcher } from '@/components/channels/MajorTabSwitcher';

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

  const isOnPrimaryMajor = channel?.name === user?.major;
  const isOnSecondMajor = channel?.name === user?.secondMajor;
  const activeSubChannel = isOnPrimaryMajor ? user?.subChannel : user?.secondMajorSubChannel;

  const filteredMessages = useMemo(() => {
    if (!user || !channel) return messages;

    // If this major doesn't have sub-channels, show all messages
    if (!hasSubChannels(channel.name)) {
      return messages;
    }

    // Use activeSubChannel
    if (!activeSubChannel) {
      return messages;
    }

    // Filter by activeSubChannel
    return messages.filter(message =>
      message.subChannel === activeSubChannel
    );
  }, [messages, user, channel, activeSubChannel]);

  const handleToggleNotifications = async () => {
    if (!user) return;

    try {
      if (notificationsEnabled) {
        await disableNotificationsForDevice(user.uid);
        setNotificationsEnabled(false);
        toast.success('Notifications disabled for this device');
      } else {
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
    subChannel?: string,
    customExpirationDate?: string,
    newFiles?: File[],
    attachmentsToKeep?: any[]
  ) => {
    if (!channel) return;

    // Pass channel.id and the new file arrays
    await updateMessage(
      messageId,
      channel.id,
      newContent,
      tags,
      subChannel,
      customExpirationDate,
      newFiles,
      attachmentsToKeep
    );
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

  const primaryMajorSlug = user?.major?.toLowerCase().replace(/\s/g, '-') || '';
  const secondMajorSlug = user?.secondMajor?.toLowerCase().replace(/\s/g, '-');

  return (
    <div className="h-full flex flex-col bg-white">
      {!isAdmin && user?.secondMajor && user.secondMajor.trim() !== '' && (
        <MajorTabSwitcher
          primaryMajor={user.major}
          secondMajor={user.secondMajor}
          primaryMajorSlug={primaryMajorSlug}
          secondMajorSlug={secondMajorSlug}
        />
      )}

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

        {channel && majorHasSubChannels && subChannels.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <label htmlFor="subChannel" className="text-xs md:text-sm font-medium text-gray-700">
              Concentration:
            </label>
            <select
              id="subChannel"
              value={activeSubChannel || ''}
              onChange={async (e) => {
                if (!user) return;
                const newSubChannel = e.target.value;
                try {
                  const userRef = doc(db, 'users', user.uid);
                  const updateField = isOnPrimaryMajor ? 'subChannel' : 'secondMajorSubChannel';
                  await updateDoc(userRef, {
                    [updateField]: newSubChannel || null
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
                  {activeSubChannel
                    ? `No ${activeSubChannel} resources yet`
                    : `Welcome to ${channel.name}!`}
                </h3>
                <p className="text-sm text-gray-500">
                  {activeSubChannel
                    ? 'Check back soon for resources in this concentration.'
                    : 'No resources have been posted yet.'}
                </p>
              </div>
            </div>
          ) : (
            filteredMessages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                user={user}
                isAdmin={isAdmin}
                moderationLoading={moderationLoading}
                onTogglePin={handleTogglePin}
                onDeleteMessage={handleDeleteMessage}
                onEditMessage={setEditingMessage}
                formatTimestamp={formatTimestamp}
              />
            ))
          )}
        </div>
      </div>

      {/* Message Composer for Admins */}
      {isAdmin && user && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-white">
          <MessageComposer
            channelId={channel.id}
            channelName={channel.name}
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