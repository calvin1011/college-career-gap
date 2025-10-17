import React, { useState } from 'react';
import { Message } from '@/types';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface EditMessageModalProps {
  message: Message;
  onClose: () => void;
  onSave: (messageId: string, newContent: string) => Promise<void>;
}

export function EditMessageModal({ message, onClose, onSave }: EditMessageModalProps) {
  const [content, setContent] = useState(message.content);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim() || content === message.content) {
      onClose();
      return;
    }
    setIsSaving(true);
    try {
      await onSave(message.id, content);
      toast.success('Message updated successfully!');
      onClose();
    } catch {
      // Error is handled in the service
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Edit Message</h2>
        <textarea
          className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
        />
        <div className="flex justify-end space-x-3 mt-4">
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