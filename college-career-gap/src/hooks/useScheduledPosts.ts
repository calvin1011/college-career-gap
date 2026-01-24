import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { ScheduledPost } from '@/types';

export function useScheduledPosts(channelId: string, authorId?: string) {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelId) {
      setScheduledPosts([]);
      setLoading(false);
      return;
    }

    const scheduledPostsRef = collection(db, 'scheduledPosts');

    const constraints = [
      where('channelId', '==', channelId),
      where('status', '==', 'pending'),
      orderBy('scheduledFor', 'asc'),
    ];

    if (authorId) {
      constraints.splice(1, 0, where('authorId', '==', authorId));
    }

    const q = query(scheduledPostsRef, ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const posts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ScheduledPost[];

        setScheduledPosts(posts);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching scheduled posts:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [channelId, authorId]);

  return { scheduledPosts, loading };
}