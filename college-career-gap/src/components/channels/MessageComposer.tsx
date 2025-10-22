'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Message, MessageTag, getSubChannelsForMajor, hasSubChannels } from '@/types';
import toast from 'react-hot-toast';
import { postMessage } from './ChannelService';
import { TagSelector } from './TagSelector';

interface MessageComposerProps {
  channelId: string;
  channelName: string;
  userId: string;
  isAdmin: boolean;
  onMessagePosted: (message: Message) => void;
}

export function MessageComposer({
  channelId,
  channelName,
  userId,
  isAdmin,
  onMessagePosted,
}: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<MessageTag[]>([]);
  const [selectedSubChannel, setSelectedSubChannel] = useState<string>('');
  const [isPosting, setIsPosting] = useState(false);

  const handleTagToggle = (tag: MessageTag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !isAdmin) {
      return;
    }
    setIsPosting(true);
    try {
      const newMessage = await postMessage(
        channelId,
        userId,
        content,
        selectedTags,
        selectedSubChannel || undefined
      );
      onMessagePosted(newMessage);
      setContent('');
      setSelectedTags([]);
      setSelectedSubChannel('');
      toast.success('Resource shared successfully!');
    } catch (error) {
      console.error('Error posting message:', error);
      toast.error('Failed to post message');
    } finally {
      setIsPosting(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card className="border-0 md:border rounded-none md:rounded-lg shadow-none md:shadow-lg">
        <CardContent className="p-4 text-center text-gray-500">
          <p className="text-sm md:text-base">Only professors can post resources in this channel.</p>
        </CardContent>
      </Card>
    );
  }

  const subChannels = hasSubChannels(channelName) ? getSubChannelsForMajor(channelName) : null;

  return (
    <div className="bg-white border-t md:border md:rounded-lg md:shadow-lg p-4">
      <form onSubmit={handleSubmit} className="space-y-3">

        {/* Sub-Channel Selector for Admin - OPTIONAL */}
        {subChannels && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Concentration <span className="text-gray-500 text-xs">(Optional - leave blank for all students)</span>
            </label>
            <select
              value={selectedSubChannel}
              onChange={(e) => setSelectedSubChannel(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All {channelName} students</option>
              {subChannels.map((subChannel) => (
                <option key={subChannel} value={subChannel}>
                  {subChannel} only
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select a concentration to target specific students, or leave as &#34; for everyone
            </p>
          </div>
        )}

        <textarea
          className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm md:text-base"
          placeholder="Share a career resource or announcement..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          disabled={isPosting}
        />

        <TagSelector
          selectedTags={selectedTags}
          onTagToggle={handleTagToggle}
        />

        <Button type="submit" loading={isPosting} className="w-full md:w-auto">
          Post
        </Button>
      </form>
    </div>
  );
}