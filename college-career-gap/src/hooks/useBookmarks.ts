import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Bookmark } from '@/types';

export function useBookmarks(userId: string | undefined) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setBookmarks([]);
      setLoading(false);
      return;
    }

    const bookmarksRef = collection(db, 'bookmarks');
    const q = query(
      bookmarksRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedBookmarks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Bookmark[];

        setBookmarks(fetchedBookmarks);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching bookmarks:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { bookmarks, loading };
}