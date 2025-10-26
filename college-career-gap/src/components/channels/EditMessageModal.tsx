import React, { useState } from 'react';
import { Message, MessageTag } from '@/types';
import { Button } from '@/components/ui/Button';
import { TagSelector } from './TagSelector';
import toast from 'react-hot-toast';
import { useSubChannels } from '@/hooks/useSubChannels';

interface EditMessageModalProps {
  message: Message;
  channelName: string;
  onClose: () => void;
  onSave: (messageId: string, newContent: string, tags: MessageTag[], subChannel?: string) => Promise<void>;
}

export function EditMessageModal({ message, channelName, onClose, onSave }: EditMessageModalProps) {
  const [content, setContent] = useState(message.content);
  const [selectedTags, setSelectedTags] = useState<MessageTag[]>(
    (message.metadata?.tags as MessageTag[]) || []
  );
  const [selectedSubChannel, setSelectedSubChannel] = useState<string>(
    message.subChannel || ''
  );
  const [isSaving, setIsSaving] = useState(false);

  // Fetch sub-channels dynamically
  const { subChannels, loading: subChannelsLoading, hasSubChannels: majorHasSubChannels } = useSubChannels(channelName);

  const handleTagToggle = (tag: MessageTag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('Message content cannot be empty');
      return;
    }

    // Check if anything changed
    const contentChanged = content !== message.content;
    const tagsChanged = JSON.stringify(selectedTags.sort()) !== JSON.stringify((message.metadata?.tags || []).sort());
    const subChannelChanged = selectedSubChannel !== (message.subChannel || '');

    if (!contentChanged && !tagsChanged && !subChannelChanged) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(message.id, content, selectedTags, selectedSubChannel || undefined);
      toast.success('Message updated successfully!');
      onClose();
    } catch {
      // Error is handled in the service
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Edit Message</h2>

        <div className="space-y-4">
          {/* Dynamic Sub-Channel Selector */}
          {majorHasSubChannels && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Concentration <span className="text-gray-500 text-xs">(Optional - leave blank for all students)</span>
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
                    disabled={isSaving}
                  >
                    <option value="">All {channelName} students</option>
                    {subChannels.map((subChannel) => (
                      <option key={subChannel} value={subChannel}>
                        {subChannel} only
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Change which concentration sees this message
                  </p>
                </>
              ) : (
                <div className="w-full h-10 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 flex items-center">
                  No concentrations configured yet
                </div>
              )}
            </div>
          )}

          {/* Message Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Content
            </label>
            <textarea
              className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              disabled={isSaving}
            />
          </div>

          {/* Tag Selector */}
          <TagSelector
            selectedTags={selectedTags}
            onTagToggle={handleTagToggle}
          />
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={isSaving}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}