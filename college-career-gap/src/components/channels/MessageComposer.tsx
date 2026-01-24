'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Message, MessageTag } from '@/types';
import toast from 'react-hot-toast';
import { postMessage } from './ChannelService';
import { TagSelector } from './TagSelector';
import { useSubChannels } from '@/hooks/useSubChannels';
import { ChevronDown, ChevronUp, Paperclip, X, FileText } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { TemplateSelector } from './TemplateSelector';
import { PostTemplate } from '@/types/templates';
import { TemplatePlaceholderHelper } from './TemplatePlaceholderHelper';

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
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [templateUsed, setTemplateUsed] = useState(false);

  // File attachment state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch sub-channels dynamically
  const { subChannels, loading: subChannelsLoading, hasSubChannels: majorHasSubChannels } = useSubChannels(channelName);

  const handleTagToggle = (tag: MessageTag) => {
    console.log('[MessageComposer] Tag toggled:', tag);
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleEmojiSelect = (emoji: string) => {
    console.log('[MessageComposer] Emoji selected:', emoji);
    setContent(prev => prev + emoji);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf',
                          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    const validFiles = files.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: File type not allowed. Only images, PDFs, and Word docs are supported.`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error(`${file.name}: File too large. Maximum size is 5MB.`);
        return false;
      }
      return true;
    });

    console.log('[MessageComposer] Files selected:', validFiles.length);
    setSelectedFiles(prev => [...prev, ...validFiles]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove file from selection
  const handleRemoveFile = (index: number) => {
    console.log('[MessageComposer] File removed at index:', index);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleTemplateSelect = (template: PostTemplate) => {
    console.log('[MessageComposer] Template selected:', template.id);
    console.log('[MessageComposer] Template content:', template.template.substring(0, 50) + '...');

    // Fill in the template content
    setContent(template.template);

    setTemplateUsed(template.id !== 'blank');
    console.log('[MessageComposer] Template tracking:', template.id !== 'blank');

    if (template.tags.length > 0) {
      console.log('[MessageComposer] Applying template tags:', template.tags);
      setSelectedTags(template.tags);
    }

    // Set default expiration if template requires it
    if (template.requiresExpiration && template.defaultExpirationDays) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + template.defaultExpirationDays);
      const formattedDate = defaultDate.toISOString().split('T')[0];
      console.log('[MessageComposer] Setting default expiration:', formattedDate);
      setExpirationDate(formattedDate);
    }

    toast.success(`Template loaded: ${template.label}`);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('[MessageComposer] Submit triggered');
    console.log('[MessageComposer] Content length:', content.length);
    console.log('[MessageComposer] Files:', selectedFiles.length);
    console.log('[MessageComposer] Tags:', selectedTags);

    if (!content.trim() && selectedFiles.length === 0) {
      toast.error('Please enter a message or attach a file');
      return;
    }

    if (!isAdmin) {
      console.log('[MessageComposer] User is not admin, aborting');
      return;
    }

    setIsPosting(true);
    try {
      console.log('[MessageComposer] Posting message to channel:', channelId);

      const newMessage = await postMessage(
        channelId,
        author,
        content,
        selectedTags,
        selectedSubChannel || undefined,
        expirationDate || undefined,
        selectedFiles
      );

      console.log('[MessageComposer] Message posted successfully:', newMessage.id);

      setTemplateUsed(false);

      onMessagePosted(newMessage);

      setContent('');
      setSelectedTags([]);
      setSelectedSubChannel('');
      setExpirationDate('');
      setSelectedFiles([]);

      toast.success('Resource shared successfully!');
    } catch (error) {
      console.error('[MessageComposer] Error posting message:', error);
      toast.error('Failed to post message');
    } finally {
      setIsPosting(false);
    }
  };

  const hasExpiringTag = selectedTags.some(tag =>
    ['internship', 'full-time', 'event', 'scholarship'].includes(tag)
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

          {/* Quick Template Button */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('[MessageComposer] Opening template selector');
                setShowTemplateSelector(true);
              }}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Use Template
            </Button>
            <p className="text-xs text-gray-500">
              Choose a pre-made template or start from scratch
            </p>
          </div>

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
                    onChange={(e) => {
                      console.log('[MessageComposer] Sub-channel changed:', e.target.value);
                      setSelectedSubChannel(e.target.value);
                    }}
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

          {/* Message textarea with emoji and attachment buttons */}
          <div className="relative">
            <textarea
              className="w-full p-3 pr-24 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm md:text-base"
              placeholder="Share a career resource or announcement..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              disabled={isPosting}
            />

            {/* Actions area inside textarea */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <EmojiPicker onEmojiSelect={handleEmojiSelect} />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPosting}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
                title="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* File preview section */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Attachments ({selectedFiles.length})
              </label>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <Paperclip className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="p-1 hover:bg-red-100 rounded-full transition-colors flex-shrink-0"
                      disabled={isPosting}
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <TemplatePlaceholderHelper
            content={content}
            templateUsed={templateUsed}
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
                onChange={(e) => {
                  console.log('[MessageComposer] Expiration date changed:', e.target.value);
                  setExpirationDate(e.target.value);
                }}
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

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <TemplateSelector
          onSelect={handleTemplateSelect}
          onClose={() => {
            console.log('[MessageComposer] Template selector closed');
            setShowTemplateSelector(false);
          }}
        />
      )}
    </div>
  );
}