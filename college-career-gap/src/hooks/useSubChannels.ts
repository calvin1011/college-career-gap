
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase/config';

/**
 * Custom hook to fetch and listen to sub-channels in real-time
 */
export function useSubChannels(major: string | undefined) {
  const [subChannels, setSubChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasSubChannels, setHasSubChannels] = useState(false);

  useEffect(() => {
    if (!major) {
      setSubChannels([]);
      setHasSubChannels(false);
      setLoading(false);
      return;
    }

    const slug = major.toLowerCase().replace(/\s/g, '-');
    const channelRef = doc(db, 'channels', slug);

    const unsubscribe = onSnapshot(
      channelRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const channels = data?.subChannels || [];
          setSubChannels(channels);
          setHasSubChannels(channels.length > 0);
        } else {
          setSubChannels([]);
          setHasSubChannels(false);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to sub-channels:', error);
        setSubChannels([]);
        setHasSubChannels(false);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [major]);

  return { subChannels, loading, hasSubChannels };
}