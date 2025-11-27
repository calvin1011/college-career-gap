'use client';

import { useState, useEffect } from 'react';
import { getActiveAnnouncements, dismissAnnouncement } from '@/services/AnnouncementService';
import { Announcement } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export function useAnnouncements() {
  const { user } = useAuth();
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAnnouncements = async () => {
      try {
        const dismissedIds = user.dismissedAnnouncements || [];
        const announcements = await getActiveAnnouncements(user.role, dismissedIds);

        // Show the newest announcement that hasn't been dismissed
        if (announcements.length > 0) {
          setCurrentAnnouncement(announcements[0]);
        }
      } catch (error) {
        console.error('Error loading announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [user]);

  const handleDismiss = async () => {
    if (!currentAnnouncement || !user) return;

    try {
      await dismissAnnouncement(user.uid, currentAnnouncement.id);
      setCurrentAnnouncement(null);
    } catch (error) {
      console.error('Error dismissing announcement:', error);
    }
  };

  return {
    currentAnnouncement,
    loading,
    dismissAnnouncement: handleDismiss,
  };
}