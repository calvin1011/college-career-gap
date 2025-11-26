'use client';

import React from 'react';
import { FieldValue, Timestamp } from 'firebase/firestore';
import { Message, MessageTag, User } from '@/types';
import { useMessageViewTracking } from '@/hooks/useMessageViewTracking';
import { Sparkles, Pin, Trash2, Edit } from 'lucide-react';
import { ExpirationBadge } from './ExpirationBadge';
import { TagBadge } from './TagBadge';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { MessageContentRenderer } from './MessageContentRenderer';
import { LinkPreviewCard } from './LinkPreviewCard';
import { ReactionPanel } from './ReactionPanel';
import { MessageStats } from './MessageStats';
import { MessageAttachments } from './MessageAttachments';

// Define the props our new component will accept
interface MessageItemProps {
  message: Message;
  user: User | null;
  isAdmin: boolean;
  moderationLoading: string | null;
  onTogglePin: (message: Message) => void;
  onDeleteMessage: (message: Message) => void;
  onEditMessage: (message: Message) => void;
  formatTimestamp: (timestamp: Date | Timestamp | FieldValue) => string;
}

export function MessageItem({
  message,
  user,
  isAdmin,
  moderationLoading,
  onTogglePin,
  onDeleteMessage,
  onEditMessage,
  formatTimestamp,
}: MessageItemProps) {

  const viewRef = useMessageViewTracking(message.id, user?.role as 'student' | 'admin');

  return (
    <div
      ref={viewRef}
      className={`p-3 rounded-lg shadow-sm border-l-4 transition-colors ${
        message.isPinned ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200'
      }`}
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
                  ? 'Adams State University'
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
                  onClick={() => onEditMessage(message)}
                  className="p-1 h-7 w-7"
                >
                  <Edit className="w-3.5 h-3.5 text-gray-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTogglePin(message)}
                  disabled={moderationLoading === message.id}
                  className="p-1 h-7 w-7"
                >
                  <Pin
                    className={`w-3.5 h-3.5 ${
                      message.isPinned ? 'text-blue-600' : 'text-gray-500'
                    }`}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteMessage(message)}
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

          {message.attachments && message.attachments.length > 0 && (
            <MessageAttachments attachments={message.attachments} />
          )}

          {/* Wrapper for reactions and stats */}
          <div className="flex items-center justify-between pt-2">
            {user && <ReactionPanel message={message} user={user} />}
            <MessageStats message={message} />
          </div>
        </div>
      </div>
    </div>
  );
}