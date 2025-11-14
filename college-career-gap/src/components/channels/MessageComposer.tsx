'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Message, MessageTag } from '@/types';
import toast from 'react-hot-toast';
import { postMessage } from './ChannelService';
import { TagSelector } from './TagSelector';
import { useSubChannels } from '@/hooks/useSubChannels';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MessageComposerProps {
  channelId: string;
  channelName: string;
  author: {
    uid: string;
    displayName: string;
    avatar?: string;
  };
  isAdmin: boolean;
  onMessagePosted: (message: Message) => void;
}

export function MessageComposer({
  channelId,
  channelName,
  author,
  isAdmin,
  onMessagePosted,
}: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<MessageTag[]>([]);
  const [selectedSubChannel, setSelectedSubChannel] = useState<string>('');
  const [isPosting, setIsPosting] = useState(false);
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch sub-channels dynamically
  const { subChannels, loading: subChannelsLoading, hasSubChannels: majorHasSubChannels } = useSubChannels(channelName);

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
        author,
        content,
        selectedTags,
        selectedSubChannel || undefined,
        expirationDate || undefined
      );

      onMessagePosted(newMessage);
      setContent('');
      setSelectedTags([]);
      setSelectedSubChannel('');
      setExpirationDate('');
      toast.success('Resource shared successfully!');
    } catch (error) {
      console.error('Error posting message:', error);
      toast.error('Failed to post message');
    } finally {
      setIsPosting(false);
    }
  };

  // Check if any expiring tag is selected (internship, full-time, or event)
  const hasExpiringTag = selectedTags.some(tag =>
    ['internship', 'full-time', 'event'].includes(tag)
  );

  if (!isAdmin) {
    return (
      <Card className="border-0 md:border rounded-none md:rounded-lg shadow-none md:shadow-lg">
        <CardContent className="p-4 text-center text-gray-500">
          <p className="text-sm md:text-base">Only professors can post resources in this channel.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="bg-white border-t md:border md:rounded-lg md:shadow-lg">
      {/* Mobile collapse toggle - only visible on small screens */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="md:hidden w-full p-4 flex items-center justify-between bg-gray-50 border-b border-gray-200 active:bg-gray-100 transition-colors"
        aria-label={isCollapsed ? "Expand composer" : "Collapse composer"}
      >
        <span className="text-sm font-semibold text-gray-700">
          {isCollapsed ? 'Show Post Form' : 'Hide Post Form'}
        </span>
        {isCollapsed ? (
          <ChevronDown className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronUp className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {/* Form content - always visible on desktop, toggleable on mobile */}
      <div className={`p-4 transition-all duration-200 ${isCollapsed ? 'hidden md:block' : 'block'}`}>
        <form onSubmit={handleSubmit} className="space-y-3">

        {/* Dynamic Sub-Channel Selector for Admin - OPTIONAL */}
        {majorHasSubChannels && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Concentration
            </label>
            {subChannelsLoading ? (
              <div className="w-full h-10 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 flex items-center">
                Loading concentrations...
              </div>
            ) : subChannels.length > 0 ? (
              <>
                <select
                  value={selectedSubChannel}
                  onChange={(e) => setSelectedSubChannel(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isPosting}
                >
                  <option value="">All {channelName} students</option>
                  {subChannels.map((subChannel) => (
                    <option key={subChannel} value={subChannel}>
                      {subChannel} only
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <div className="w-full h-10 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 flex items-center">
                No concentrations configured yet
              </div>
            )}
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

          {hasExpiringTag && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration Date <span className="text-gray-500 text-xs">(Optional - defaults to 7 days)</span>
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isPosting}
              />
            </div>
          )}

          <Button type="submit" loading={isPosting} className="w-full md:w-auto">
            Post
          </Button>
        </form>
      </div>
    </div>
  );
}