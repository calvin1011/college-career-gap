'use client';

import React from 'react';
import { Message, User } from '@/types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { toggleReaction } from './ChannelService';

// Define the emojis we want to allow
const ALLOWED_REACTIONS = ['👍', '❤️', '💡', '🚀', '🤔'];

interface ReactionPanelProps {
  message: Message;
  user: User;
}

export function ReactionPanel({ message, user }: ReactionPanelProps) {
  const handleReactionClick = async (emoji: string) => {
    try {
      // We are updating the database directly.
      // The real-time listener in `useMessages` will automatically refresh the UI.
      await toggleReaction(message.id, emoji, user.uid);
    } catch (error) {
      // The error is already handled and toasted in the service function.
    }
  };

  return (
    <div className="mt-3 flex items-center space-x-2">
      {ALLOWED_REACTIONS.map((emoji) => {
        const usersWhoReacted = message.reactions?.[emoji] || [];
        const count = usersWhoReacted.length;
        const userHasReacted = usersWhoReacted.includes(user.uid);

        return (
          <Button
            key={emoji}
            variant="outline"
            size="sm"
            onClick={() => handleReactionClick(emoji)}
            className={cn(
              "px-2 py-1 text-sm rounded-full transition-colors",
              userHasReacted
                ? "bg-blue-100 border-blue-500 text-blue-700"
                : "bg-gray-100 hover:bg-gray-200"
            )}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="ml-1.5 text-xs font-semibold">{count}</span>}
          </Button>
        );
      })}
    </div>
  );
}