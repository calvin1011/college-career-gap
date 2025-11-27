'use client';

import { useState, useEffect } from 'react';
import { dismissAnnouncement } from '@/services/AnnouncementService';
import { Announcement } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase/config';

export function useAnnouncements() {
  const { user } = useAuth();
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const dismissedIds = user.dismissedAnnouncements || [];

    // Real-time listener for active announcements
    const announcementsRef = collection(db, 'announcements');
    const q = query(
      announcementsRef,
      where('isActive', '==', true),
      where('targetAudience', 'array-contains', user.role),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const announcements = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Announcement[];

      // Filter out dismissed announcements
      const unseenAnnouncements = announcements.filter(
        announcement => !dismissedIds.includes(announcement.id)
      );

      // Show the newest unseen announcement
      if (unseenAnnouncements.length > 0) {
        setCurrentAnnouncement(unseenAnnouncements[0]);
      } else {
        setCurrentAnnouncement(null);
      }

      setLoading(false);
    }, (error) => {
      console.error('Error listening to announcements:', error);
      setLoading(false);
    });

    return () => unsubscribe();
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