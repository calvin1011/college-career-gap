import React, { useState } from 'react';
import { ScheduledPost, MessageTag } from '@/types';
import { Button } from '@/components/ui/Button';
import { TagSelector } from './TagSelector';
import { X, Calendar } from 'lucide-react';
import { updateScheduledPost } from '@/services/ScheduledPostService';
import { Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface EditScheduledPostModalProps {
  post: ScheduledPost;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditScheduledPostModal({ post, onClose, onSuccess }: EditScheduledPostModalProps) {
  const existingScheduledDate = post.scheduledFor instanceof Timestamp
    ? post.scheduledFor.toDate()
    : post.scheduledFor;

  const existingExpirationDate = post.expiresAt
    ? (post.expiresAt instanceof Timestamp ? post.expiresAt.toDate() : post.expiresAt)
    : null;

  const [content, setContent] = useState(post.content);
  const [selectedTags, setSelectedTags] = useState<MessageTag[]>(
    (post.metadata?.tags as MessageTag[]) || []
  );
  const [scheduledDate, setScheduledDate] = useState(
    existingScheduledDate.toISOString().split('T')[0]
  );
  const [scheduledTime, setScheduledTime] = useState(
    existingScheduledDate.toTimeString().slice(0, 5)
  );
  const [expirationDate, setExpirationDate] = useState(
    existingExpirationDate ? existingExpirationDate.toISOString().split('T')[0] : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTagToggle = (tag: MessageTag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const hasExpiringTag = selectedTags.some(tag =>
    ['internship', 'full-time', 'event', 'scholarship'].includes(tag)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('Content cannot be empty');
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      toast.error('Please select date and time');
      return;
    }

    const newScheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const now = new Date();

    if (newScheduledDateTime <= now) {
      toast.error('Scheduled time must be in the future');
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: {
        content?: string;
        scheduledFor?: Date;
        tags?: MessageTag[];
        expiresAt?: Date;
      } = {};

      if (content !== post.content) {
        updates.content = content;
      }

      const originalScheduledTime = existingScheduledDate.getTime();
      const newScheduledTime = newScheduledDateTime.getTime();
      if (Math.abs(originalScheduledTime - newScheduledTime) > 1000) {
        updates.scheduledFor = newScheduledDateTime;
      }

      const currentTags = (post.metadata?.tags as MessageTag[]) || [];
      if (JSON.stringify(selectedTags.sort()) !== JSON.stringify(currentTags.sort())) {
        updates.tags = selectedTags;
      }

      if (expirationDate) {
        const newExpiration = new Date(expirationDate);
        const oldExpiration = existingExpirationDate?.getTime();
        const newExpirationTime = newExpiration.getTime();
        if (!oldExpiration || Math.abs(oldExpiration - newExpirationTime) > 1000) {
          updates.expiresAt = newExpiration;
        }
      }

      if (Object.keys(updates).length === 0) {
        toast('No changes detected');
        onClose();
        return;
      }

      await updateScheduledPost(post.id, updates);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating scheduled post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Scheduled Post</h2>
            <p className="text-sm text-gray-500 mt-1">Update your scheduled post details</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Content
            </label>
            <textarea
              className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              disabled={isSubmitting}
            />
          </div>

          <TagSelector selectedTags={selectedTags} onTagToggle={handleTagToggle} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Publish Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Publish Time
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          {scheduledDate && scheduledTime && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Will publish:</strong>{' '}
                {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}

          {hasExpiringTag && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration Date <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                min={scheduledDate || new Date().toISOString().split('T')[0]}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}