import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { User } from '@/types';

interface FeedbackData {
  content: string;
  type: 'bug' | 'suggestion' | 'other';
}

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