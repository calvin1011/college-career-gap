'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Message } from '@/types';
import toast from 'react-hot-toast';
import { postMessage } from './ChannelService';

interface MessageComposerProps {
  channelId: string;
  userId: string;
  isAdmin: boolean;
  onMessagePosted: (message: Message) => void;
}

export function MessageComposer({
  channelId,
  userId,
  isAdmin,
  onMessagePosted,
}: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !isAdmin) {
      return;
    }
    setIsPosting(true);
    try {
      const newMessage = await postMessage(channelId, userId, content);
      onMessagePosted(newMessage);
      setContent('');
      toast.success('Resource shared successfully!');
    } catch (error) {
      console.error('Error posting message:', error);
    } finally {
      setIsPosting(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card className="mt-8">
        <CardContent className="p-4 text-center text-gray-500">
          <p>Only professors can post resources in this channel.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-8 p-4 bg-white rounded-lg shadow-lg">
      <form onSubmit={handleSubmit} className="flex space-x-4">
        <textarea
          className="flex-1 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Share a career resource or announcement..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          disabled={isPosting}
        />
        <Button type="submit" loading={isPosting}>
          Post
        </Button>
      </form>
    </div>
  );
}