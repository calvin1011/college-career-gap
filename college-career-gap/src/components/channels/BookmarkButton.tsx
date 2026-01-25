'use client';

import React, { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { toggleBookmark } from '@/services/BookmarkService';
import { cn } from '@/utils/cn';

interface BookmarkButtonProps {
  messageId: string;
  channelId: string;
  userId: string;
  isBookmarked: boolean;
  size?: 'sm' | 'md';
}

export function BookmarkButton({
  messageId,
  channelId,
  userId,
  isBookmarked,
  size = 'md',
}: BookmarkButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (loading) return;

    setLoading(true);
    try {
      await toggleBookmark(userId, messageId, channelId, isBookmarked);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setLoading(false);
    }
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        'p-2 rounded-full transition-colors',
        isBookmarked
          ? 'text-yellow-600 hover:bg-yellow-50'
          : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50',
        loading && 'opacity-50 cursor-not-allowed'
      )}
      title={isBookmarked ? 'Remove bookmark' : 'Save for later'}
    >
      {isBookmarked ? (
        <BookmarkCheck className={iconSize} />
      ) : (
        <Bookmark className={iconSize} />
      )}
    </button>
  );
}