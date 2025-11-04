'use client';

import React from 'react';
import { Message } from '@/types';
import { MousePointerClick, Eye } from 'lucide-react';

interface MessageStatsProps {
  message: Message;
}

export function MessageStats({ message }: MessageStatsProps) {
  const clickCount = message.clickCount || 0;
  const viewCount = message.viewCount || 0;

  // Only render if the message has clicks OR views
  if (viewCount === 0 && (message.type !== 'link' || clickCount === 0)) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3 text-xs text-gray-500">
      {/* View Count */}
      {viewCount > 0 && (
        <div className="flex items-center" title={`${viewCount} views`}>
          <Eye className="w-3.5 h-3.5 mr-1" />
          <span>{viewCount}</span>
        </div>
      )}

      {/* Click Count (only for links) */}
      {message.type === 'link' && clickCount > 0 && (
        <div className="flex items-center" title={`${clickCount} link clicks`}>
          <MousePointerClick className="w-3.5 h-3.5 mr-1" />
          <span>{clickCount}</span>
        </div>
      )}
    </div>
  );
}