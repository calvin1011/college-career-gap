'use client';

import { useState, useEffect } from 'react';
import { db } from '@/services/firebase/config';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
} from 'firebase/firestore';
import { Message } from '@/types';

/**
 * A custom hook to fetch and listen for real-time messages in a channel.
 * @param channelId The ID of the channel to fetch messages for.
 */
export function useMessages(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('channelId', '==', channelId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedMessages: Message[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];

        // pinned first, then by creation date
        const sortedMessages = fetchedMessages.sort((a, b) => {
          // If both are pinned or both are not pinned, sort by date
          if (a.isPinned === b.isPinned) {
            const aTime = a.createdAt instanceof Date
              ? a.createdAt.getTime()
              : 'toDate' in a.createdAt
                ? a.createdAt.toDate().getTime()
                : Date.now();
            const bTime = b.createdAt instanceof Date
              ? b.createdAt.getTime()
              : 'toDate' in b.createdAt
                ? b.createdAt.toDate().getTime()
                : Date.now();
            return bTime - aTime; // Newest first
          }
          // Pinned messages come first
          return a.isPinned ? -1 : 1;
        });

        setMessages(sortedMessages);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching real-time messages:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Cleanup the subscription on component unmount
    return () => unsubscribe();
  }, [channelId]);

  return { messages, loading, error };
}