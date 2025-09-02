import { useState, useEffect } from 'react';
import { getChannels } from '@/components/channels/ChannelService';
import { Channel } from '@/types';

export function useChannel() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const fetchedChannels = await getChannels();
        setChannels(fetchedChannels);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingChannels(false);
      }
    };

    fetchChannels();
  }, []);

  return { channels, loadingChannels, error };
}
