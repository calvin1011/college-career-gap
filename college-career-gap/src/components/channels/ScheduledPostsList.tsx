import React, { useState } from 'react';
import { ScheduledPost } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Calendar, Clock, Edit2, Trash2, XCircle } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { cancelScheduledPost, deleteScheduledPost } from '@/services/ScheduledPostService';
import { TagBadge } from './TagBadge';
import { MessageTag } from '@/types';

interface ScheduledPostsListProps {
  scheduledPosts: ScheduledPost[];
  onEdit?: (post: ScheduledPost) => void;
}

export function ScheduledPostsList({ scheduledPosts, onEdit }: ScheduledPostsListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (postId: string) => {
    if (!window.confirm('Cancel this scheduled post?')) return;

    setCancellingId(postId);
    try {
      await cancelScheduledPost(postId);
    } catch (error) {
      console.error('Error cancelling post:', error);
    } finally {
      setCancellingId(null);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Permanently delete this scheduled post?')) return;

    setDeletingId(postId);
    try {
      await deleteScheduledPost(postId);
    } catch (error) {
      console.error('Error deleting post:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatScheduledTime = (timestamp: Date | Timestamp): string => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getTimeUntilPublish = (timestamp: Date | Timestamp): string => {
    const scheduledDate = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    const now = new Date();
    const diffMs = scheduledDate.getTime() - now.getTime();

    if (diffMs < 0) return 'Publishing soon...';

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    if (diffHours > 0) return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    if (diffMins > 0) return `in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
    return 'in < 1 minute';
  };

  if (scheduledPosts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Scheduled Posts</h3>
          <p className="text-gray-500 text-sm">
            Schedule posts to publish them automatically at a specific time
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {scheduledPosts.map((post) => (
        <Card key={post.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    <Clock className="w-3 h-3" />
                    {getTimeUntilPublish(post.scheduledFor)}
                  </div>

                  {post.subChannel && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      {post.subChannel}
                    </span>
                  )}
                </div>

                <p className="text-gray-800 text-sm mb-2 line-clamp-3">{post.content}</p>

                {post.metadata?.tags && post.metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {post.metadata.tags.map((tag) => (
                      <TagBadge key={tag} tag={tag as MessageTag} />
                    ))}
                  </div>
                )}

                {post.attachments && post.attachments.length > 0 && (
                  <p className="text-xs text-gray-500 mb-2">
                    📎 {post.attachments.length} attachment{post.attachments.length !== 1 ? 's' : ''}
                  </p>
                )}

                <div className="flex items-center text-xs text-gray-500 gap-3">
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatScheduledTime(post.scheduledFor)}
                  </span>
                  {post.expiresAt && (
                    <span>
                      Expires: {formatScheduledTime(post.expiresAt)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 flex-shrink-0">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(post)}
                    className="h-8 w-8 p-0"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancel(post.id)}
                  disabled={cancellingId === post.id}
                  className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-50"
                  title="Cancel"
                >
                  <XCircle className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(post.id)}
                  disabled={deletingId === post.id}
                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}