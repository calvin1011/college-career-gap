'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { submitFeedback } from '@/services/FeedbackService';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

interface FeedbackModalProps {
  onClose: () => void;
}

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [type, setType] = useState<'bug' | 'suggestion' | 'other'>('suggestion');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) {
      toast.error('Please enter your feedback before submitting.');
      return;
    }
    setLoading(true);
    try {
      await submitFeedback({ content, type }, user);
      toast.success('Thank you! Your feedback has been submitted.');
      onClose();
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg relative">
        <CardHeader>
          <h2 className="text-xl font-bold">Submit Feedback</h2>
          <p className="text-sm text-gray-500">Have a suggestion or found a bug? Let us know!</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Feedback Type</label>
              <div className="flex space-x-2">
                {(['suggestion', 'bug', 'other'] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={type === t ? 'primary' : 'outline'}
                    onClick={() => setType(t)}
                    className="capitalize"
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
            <textarea
              className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Please provide as much detail as possible..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              required
            />
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Submit Feedback
              </Button>
            </div>
          </form>
        </CardContent>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>
      </Card>
    </div>
  );
}