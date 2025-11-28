import React, { useState, useRef } from 'react';
import { Message, MessageTag, MessageAttachment } from '@/types';
import { Button } from '@/components/ui/Button';
import { TagSelector } from './TagSelector';
import toast from 'react-hot-toast';
import { useSubChannels } from '@/hooks/useSubChannels';
import { Timestamp } from 'firebase/firestore';
import { EmojiPicker } from './EmojiPicker';
import { Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';

interface EditMessageModalProps {
  message: Message;
  channelName: string;
  onClose: () => void;
  onSave: (
    messageId: string,
    newContent: string,
    tags: MessageTag[],
    subChannel?: string,
    customExpirationDate?: string,
    newFiles?: File[],
    attachmentsToKeep?: MessageAttachment[]
  ) => Promise<void>;
}

export function EditMessageModal({ message, channelName, onClose, onSave }: EditMessageModalProps) {
  const [content, setContent] = useState(message.content);
  const [selectedTags, setSelectedTags] = useState<MessageTag[]>(
    (message.metadata?.tags as MessageTag[]) || []
  );
  const [selectedSubChannel, setSelectedSubChannel] = useState<string>(
    message.subChannel || ''
  );

  // Attachment State
  const [existingAttachments, setExistingAttachments] = useState<MessageAttachment[]>(
    message.attachments || []
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);

  // Fetch sub-channels dynamically
  const { subChannels, hasSubChannels: majorHasSubChannels } = useSubChannels(channelName);

  const handleTagToggle = (tag: MessageTag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent(prev => prev + emoji);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf',
                          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    const validFiles = files.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: File type not allowed.`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: File too large (Max 5MB).`);
        return false;
      }
      return true;
    });

    setNewFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (attachmentId: string) => {
    setExistingAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const hasExpiringTag = selectedTags.some(tag =>
    ['internship', 'full-time', 'event', 'scholarship'].includes(tag)
  );

  const getExistingExpirationDate = () => {
    if (message.expiresAt) {
      let date: Date;
      if (message.expiresAt instanceof Date) {
        date = message.expiresAt;
      } else if (message.expiresAt instanceof Timestamp) {
        date = message.expiresAt.toDate();
      } else {
        return '';
      }
      // Format to YYYY-MM-DD for input[type="date"]
      return date.toISOString().split('T')[0];
    }
    return '';
  };

  const [expirationDate, setExpirationDate] = useState<string>(getExistingExpirationDate());

  const handleSave = async () => {
    if (!content.trim() && existingAttachments.length === 0 && newFiles.length === 0) {
      toast.error('Message content cannot be empty');
      return;
    }

    // Check if anything changed
    const contentChanged = content !== message.content;
    const tagsChanged = JSON.stringify([...selectedTags].sort()) !== JSON.stringify([...(message.metadata?.tags || [])].sort());
    const subChannelChanged = selectedSubChannel !== (message.subChannel || '');
    const expirationChanged = expirationDate !== getExistingExpirationDate();

    // Also check for file changes
    const filesChanged = newFiles.length > 0 || existingAttachments.length !== (message.attachments?.length || 0);

    if (!contentChanged && !tagsChanged && !subChannelChanged && !expirationChanged && !filesChanged) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(
        message.id,
        content,
        selectedTags,
        selectedSubChannel || undefined,
        expirationDate || undefined,
        newFiles,
        existingAttachments
      );
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
          {/* Sub-Channel Selector */}
          {majorHasSubChannels && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Concentration</label>
              <select
                value={selectedSubChannel}
                onChange={(e) => setSelectedSubChannel(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSaving}
              >
                <option value="">All {channelName} students</option>
                {subChannels.map((subChannel) => (
                  <option key={subChannel} value={subChannel}>{subChannel} only</option>
                ))}
              </select>
            </div>
          )}

          {/* Message Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message Content</label>
            <div className="relative">
              <textarea
                className="w-full p-3 pr-24 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                disabled={isSaving}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Existing Attachments */}
          {existingAttachments.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Attachments</label>
              <div className="space-y-2">
                {existingAttachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {att.type === 'image' ? <ImageIcon className="w-4 h-4 text-blue-600" /> : <FileText className="w-4 h-4 text-gray-500" />}
                      <span className="text-sm text-gray-900 truncate">{att.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExistingAttachment(att.id)}
                      className="p-1 hover:bg-red-100 rounded-full text-gray-400 hover:text-red-600"
                      title="Remove attachment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Files Pending Upload */}
          {newFiles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-green-700 mb-2">New Uploads</label>
              <div className="space-y-2">
                {newFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <Paperclip className="w-4 h-4 text-blue-600" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNewFile(index)}
                      className="p-1 hover:bg-red-100 rounded-full text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tag Selector */}
          <TagSelector selectedTags={selectedTags} onTagToggle={handleTagToggle} />

          {/* Expiration Date */}
          {hasExpiringTag && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expiration Date</label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSaving}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} loading={isSaving}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}