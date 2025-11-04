import React from 'react';
import { recordMessageClick } from './ChannelService';

interface MessageContentRendererProps {
  content: string;
  messageId?: string;
}

export function MessageContentRenderer({ content, messageId }: MessageContentRendererProps) {
  // Regular expression to find URLs in text
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);

  const handleLinkClick = async (e: React.MouseEvent, url: string) => {
    e.preventDefault();

    // Open link immediately
    window.open(url, '_blank', 'noopener,noreferrer');

    // Record click if messageId is provided
    if (messageId) {
      try {
        await recordMessageClick(messageId);
      } catch (error) {
        console.error('Failed to record click:', error);
      }
    }
  };

  return (
    <p className="text-gray-800 leading-relaxed mt-1 whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={index}
              href={part}
              onClick={(e) => handleLinkClick(e, part)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline cursor-pointer"
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </p>
  );
}