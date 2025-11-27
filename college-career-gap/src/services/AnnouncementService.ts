import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Announcement } from '@/types';

/**
 * Fetches active announcements for a specific user role
 */
export async function getActiveAnnouncements(
  userRole: 'student' | 'admin',
  dismissedIds: string[] = []
): Promise<Announcement[]> {
  try {
    const announcementsRef = collection(db, 'announcements');
    const q = query(
      announcementsRef,
      where('isActive', '==', true),
      where('targetAudience', 'array-contains', userRole),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const announcements = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Announcement[];

    // Filter out announcements the user has already dismissed
    return announcements.filter(announcement =>
      !dismissedIds.includes(announcement.id)
    );
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return [];
  }
}

/**
 * Marks an announcement as dismissed for a user
 */
export async function dismissAnnouncement(
  userId: string,
  announcementId: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      dismissedAnnouncements: arrayUnion(announcementId)
    });
  } catch (error) {
    console.error('Error dismissing announcement:', error);
    throw error;
  }
}

/**
 * Creates a new announcement (admin only)
 */
export async function createAnnouncement(
  title: string,
  message: string,
  targetAudience: ('student' | 'admin')[],
  isActive: boolean = false
): Promise<string> {
  try {
    const announcementsRef = collection(db, 'announcements');
    const docRef = await addDoc(announcementsRef, {
      title,
      message,
      targetAudience,
      isActive,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating announcement:', error);
    throw error;
  }
}

/**
 * Toggles an announcement's active status (admin only)
 */
export async function toggleAnnouncementStatus(
  announcementId: string,
  isActive: boolean
): Promise<void> {
  try {
    const announcementRef = doc(db, 'announcements', announcementId);
    await updateDoc(announcementRef, {
      isActive
    });
  } catch (error) {
    console.error('Error toggling announcement status:', error);
    throw error;
  }
}