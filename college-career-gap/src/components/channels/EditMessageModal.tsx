import React, { useState } from 'react';
import { Message, MessageTag } from '@/types';
import { Button } from '@/components/ui/Button';
import { TagSelector } from './TagSelector';
import toast from 'react-hot-toast';

interface EditMessageModalProps {
  message: Message;
  onClose: () => void;
  onSave: (messageId: string, newContent: string, tags: MessageTag[]) => Promise<void>;
}

export function EditMessageModal({ message, onClose, onSave }: EditMessageModalProps) {
  const [content, setContent] = useState(message.content);
  const [selectedTags, setSelectedTags] = useState<MessageTag[]>(
    (message.metadata?.tags as MessageTag[]) || []
  );
  const [isSaving, setIsSaving] = useState(false);

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

    if (content === message.content &&
        JSON.stringify(selectedTags.sort()) === JSON.stringify((message.metadata?.tags || []).sort())) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(message.id, content, selectedTags);
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Content
            </label>
            <textarea
              className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
            />
          </div>

          <TagSelector
            selectedTags={selectedTags}
            onTagToggle={handleTagToggle}
          />
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose}>
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