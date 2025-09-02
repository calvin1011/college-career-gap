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

        setMessages(fetchedMessages);
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