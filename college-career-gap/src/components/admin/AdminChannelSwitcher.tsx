'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, Check } from 'lucide-react';
import { Channel } from '@/types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase/config';

export function AdminChannelSwitcher() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [adminChannels, setAdminChannels] = useState<Channel[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdminChannels() {
      if (!user || user.role !== 'admin') {
        setLoading(false);
        return;
      }

      try {
        // Get all channels where this user is in the admins array
        const channelsRef = collection(db, 'channels');
        const q = query(
          channelsRef,
          where('admins', 'array-contains', user.uid)
        );

        const snapshot = await getDocs(q);
        const channels = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Channel[];

        setAdminChannels(channels);
      } catch (error) {
        console.error('Error fetching admin channels:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAdminChannels();
  }, [user]);

  // Don't show if not admin or only has one channel
  if (!user || user.role !== 'admin' || adminChannels.length <= 1 || loading) {
    return null;
  }

  // Determine current channel from pathname
  const currentChannelSlug = pathname.split('/channels/')[1];
  const currentChannel = adminChannels.find(ch => ch.slug === currentChannelSlug);

  const handleChannelSwitch = (channel: Channel) => {
    router.push(`/dashboard/channels/${channel.slug}`);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Switch admin channel"
      >
        <div className="flex items-center space-x-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: currentChannel?.color || '#3B82F6' }}
          />
          <span className="font-medium text-gray-900 text-sm">
            {currentChannel?.name || 'Select Channel'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-2">
              <p className="text-xs font-semibold text-gray-500 uppercase px-2 py-1 mb-1">
                Your Admin Channels
              </p>
              <div className="space-y-1">
                {adminChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelSwitch(channel)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: channel.color }}
                      />
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">
                          {channel.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {channel.memberCount} members
                        </p>
                      </div>
                    </div>
                    {currentChannelSlug === channel.slug && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}