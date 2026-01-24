'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useScheduledPosts } from '@/hooks/useScheduledPosts';
import { ScheduledPostsList } from '@/components/channels/ScheduledPostsList';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Calendar, AlertCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ScheduledPost } from '@/types';
import { EditScheduledPostModal } from '@/components/channels/EditScheduledPostModal';

export default function ScheduledPostsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const channelSlug = searchParams.get('channel');

  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);

  const isAdmin = user?.role === 'admin';
  const majorSlug = user?.major?.toLowerCase().replace(/\s/g, '-');
  const currentChannelSlug = channelSlug || majorSlug || '';

  const { scheduledPosts, loading } = useScheduledPosts(
    currentChannelSlug,
    user?.uid
  );

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md mx-auto text-center p-8">
          <CardContent>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600">Only professors can view scheduled posts.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const upcomingPosts = scheduledPosts.filter(post => {
    const scheduledDate = post.scheduledFor instanceof Date
      ? post.scheduledFor
      : post.scheduledFor.toDate();
    return scheduledDate > new Date();
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Scheduled Posts</h1>
        </div>
        <p className="text-gray-600">
          Manage your upcoming scheduled posts for {user.major}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Scheduled</p>
                <p className="text-3xl font-bold text-gray-900">{scheduledPosts.length}</p>
              </div>
              <Calendar className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Publishing Soon</p>
                <p className="text-3xl font-bold text-green-600">
                  {scheduledPosts.filter(post => {
                    const scheduledDate = post.scheduledFor instanceof Date
                      ? post.scheduledFor
                      : post.scheduledFor.toDate();
                    const hoursUntil = (scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60);
                    return hoursUntil <= 24 && hoursUntil > 0;
                  }).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Next 24 hours</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-3xl font-bold text-purple-600">
                  {scheduledPosts.filter(post => {
                    const scheduledDate = post.scheduledFor instanceof Date
                      ? post.scheduledFor
                      : post.scheduledFor.toDate();
                    const daysUntil = (scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                    return daysUntil <= 7 && daysUntil > 0;
                  }).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Next 7 days</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold">Upcoming Posts</h2>
          <p className="text-sm text-gray-500 mt-1">
            These posts will be automatically published at their scheduled time
          </p>
        </CardHeader>
        <CardContent>
          <ScheduledPostsList
            scheduledPosts={upcomingPosts}
            onEdit={setEditingPost}
          />
        </CardContent>
      </Card>

      <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              <strong>How it works:</strong> Scheduled posts are automatically published at their scheduled time.
              You can edit or cancel them anytime before they publish. Posts with expiring tags will auto-delete
              after their expiration date.
            </p>
          </div>
        </div>
      </div>

      {editingPost && (
        <EditScheduledPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSuccess={() => setEditingPost(null)}
        />
      )}
    </div>
  );
}