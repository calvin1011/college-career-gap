import {
  collection,
    doc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Bookmark } from '@/types';
import toast from 'react-hot-toast';

export async function toggleBookmark(
  userId: string,
  messageId: string,
  channelId: string,
  isCurrentlyBookmarked: boolean
): Promise<void> {
  try {
    if (isCurrentlyBookmarked) {
      await removeBookmark(userId, messageId);
    } else {
      await addBookmark(userId, messageId, channelId);
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    toast.error('Failed to update bookmark');
    throw error;
  }
}

async function addBookmark(
  userId: string,
  messageId: string,
  channelId: string
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', userId);
    const bookmarksRef = collection(db, 'bookmarks');

    const newBookmark = {
      userId,
      messageId,
      channelId,
      createdAt: serverTimestamp(),
    };

    const bookmarkDocRef = doc(bookmarksRef);
    transaction.set(bookmarkDocRef, newBookmark);

    transaction.update(userRef, {
      bookmarkedMessages: arrayUnion(messageId),
    });
  });

  toast.success('Saved to bookmarks');
}

async function removeBookmark(userId: string, messageId: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', userId);

    const bookmarksRef = collection(db, 'bookmarks');
    const q = query(
      bookmarksRef,
      where('userId', '==', userId),
      where('messageId', '==', messageId)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const bookmarkDoc = snapshot.docs[0];
      transaction.delete(bookmarkDoc.ref);
    }

    transaction.update(userRef, {
      bookmarkedMessages: arrayRemove(messageId),
    });
  });

  toast.success('Removed from bookmarks');
}

export async function getUserBookmarks(userId: string): Promise<Bookmark[]> {
  try {
    const bookmarksRef = collection(db, 'bookmarks');
    const q = query(
      bookmarksRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Bookmark[];
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return [];
  }
}

export async function addBookmarkNote(
  bookmarkId: string,
  note: string
): Promise<void> {
  try {
    const bookmarkRef = doc(db, 'bookmarks', bookmarkId);
    await runTransaction(db, async (transaction) => {
      transaction.update(bookmarkRef, { note });
    });
    toast.success('Note saved');
  } catch (error) {
    console.error('Error adding note:', error);
    toast.error('Failed to save note');
    throw error;
  }
}