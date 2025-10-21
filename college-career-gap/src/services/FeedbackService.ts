import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { User } from '@/types';

interface FeedbackData {
  content: string;
  type: 'bug' | 'suggestion' | 'other';
}

export type FeedbackStatus = 'new' | 'in-progress' | 'resolved';

/**
 * Submits feedback to the Firestore collection.
 */
export async function submitFeedback(feedbackData: FeedbackData, author: User): Promise<void> {
  if (!feedbackData.content.trim()) {
    throw new Error('Feedback cannot be empty.');
  }

  const feedbackCollectionRef = collection(db, 'feedback');

  await addDoc(feedbackCollectionRef, {
    ...feedbackData,
    submittedAt: serverTimestamp(),
    status: 'new', // default status
    author: {
      uid: author.uid,
      email: author.email,
      displayName: author.displayName,
      role: author.role,
    },
  });
}

/**
 * Updates the status of a feedback submission.
 */
export async function updateFeedbackStatus(
  feedbackId: string,
  newStatus: FeedbackStatus
): Promise<void> {
  const feedbackRef = doc(db, 'feedback', feedbackId);

  await updateDoc(feedbackRef, {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
}