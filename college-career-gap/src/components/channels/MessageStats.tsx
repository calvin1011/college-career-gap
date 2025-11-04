'use client';

import React from 'react';
import { Message } from '@/types';
import { MousePointerClick } from 'lucide-react';

interface MessageStatsProps {
  message: Message;
}

export function MessageStats({ message }: MessageStatsProps) {
  const clickCount = message.clickCount || 0;

  // Only render if the message is a link and has at least one click
  if (message.type !== 'link' || clickCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3 text-xs text-gray-500">
      <div className="flex items-center" title={`${clickCount} link clicks`}>
        <MousePointerClick className="w-3.5 h-3.5 mr-1" />
        <span>{clickCount}</span>
      </div>
    </div>
  );
}