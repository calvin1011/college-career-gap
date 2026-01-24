import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, storage } from '@/services/firebase/config';
import { ScheduledPost, MessageTag, MessageAttachment } from '@/types';
import { sanitizeMessageContent } from '@/utils/validation';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

async function uploadScheduledPostAttachments(
  scheduledPostId: string,
  channelId: string,
  files: File[]
): Promise<MessageAttachment[]> {
  const attachments: MessageAttachment[] = [];

  for (const file of files) {
    try {
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `scheduled_attachments/${channelId}/${scheduledPostId}_${timestamp}_${sanitizedFileName}`;

      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      let fileType: 'image' | 'pdf' | 'document' = 'document';
      if (file.type.startsWith('image/')) {
        fileType = 'image';
      } else if (file.type === 'application/pdf') {
        fileType = 'pdf';
      }

      attachments.push({
        id: `${scheduledPostId}_${timestamp}`,
        name: file.name,
        url: downloadURL,
        size: file.size,
        type: fileType,
        uploadedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      toast.error(`Failed to upload ${file.name}`);
    }
  }

  return attachments;
}

export async function createScheduledPost(
  channelId: string,
  author: { uid: string; displayName: string; avatar?: string },
  content: string,
  scheduledFor: Date,
  tags: MessageTag[] = [],
  subChannel?: string,
  customExpirationDate?: string,
  files?: File[]
): Promise<ScheduledPost> {
  const sanitizedContent = sanitizeMessageContent(content);

  let expiresAt: Date | undefined;
  const hasExpiringTag = tags.some(tag =>
    ['internship', 'full-time', 'scholarship', 'event'].includes(tag)
  );

  if (hasExpiringTag) {
    if (customExpirationDate) {
      expiresAt = new Date(customExpirationDate);
    } else {
      expiresAt = new Date(scheduledFor);
      expiresAt.setDate(expiresAt.getDate() + 7);
    }
  }

  const scheduledPostsRef = collection(db, 'scheduledPosts');
  const newPostRef = doc(scheduledPostsRef);

  let attachments: MessageAttachment[] = [];
  if (files && files.length > 0) {
    toast.loading('Uploading attachments...');
    attachments = await uploadScheduledPostAttachments(newPostRef.id, channelId, files);
    toast.dismiss();
  }

  const scheduledPost: Omit<ScheduledPost, 'id'> = {
    channelId,
    authorId: author.uid,
    authorDisplayName: author.displayName,
    content: sanitizedContent,
    scheduledFor: Timestamp.fromDate(scheduledFor),
    status: 'pending',
    createdAt: serverTimestamp(),
    ...(author.avatar ? { authorAvatar: author.avatar } : {}),
    ...(subChannel ? { subChannel } : {}),
    ...(expiresAt ? { expiresAt: Timestamp.fromDate(expiresAt) } : {}),
    ...(attachments.length > 0 ? { attachments } : {}),
    metadata: {
      ...(tags.length > 0 ? { tags } : {}),
    },
  };

  await addDoc(scheduledPostsRef, scheduledPost);

  const createdDoc = await getDoc(newPostRef);
  return {
    id: createdDoc.id,
    ...createdDoc.data(),
  } as ScheduledPost;
}

export async function cancelScheduledPost(scheduledPostId: string): Promise<void> {
  const postRef = doc(db, 'scheduledPosts', scheduledPostId);
  await updateDoc(postRef, {
    status: 'cancelled',
  });
  toast.success('Scheduled post cancelled');
}

export async function deleteScheduledPost(scheduledPostId: string): Promise<void> {
  const postRef = doc(db, 'scheduledPosts', scheduledPostId);
  await deleteDoc(postRef);
  toast.success('Scheduled post deleted');
}

export async function updateScheduledPost(
  scheduledPostId: string,
  updates: {
    content?: string;
    scheduledFor?: Date;
    tags?: MessageTag[];
    subChannel?: string;
    expiresAt?: Date;
  }
): Promise<void> {
  const postRef = doc(db, 'scheduledPosts', scheduledPostId);

  const updateData: Record<string, unknown> = {};

  if (updates.content) {
    updateData.content = sanitizeMessageContent(updates.content);
  }

  if (updates.scheduledFor) {
    updateData.scheduledFor = Timestamp.fromDate(updates.scheduledFor);
  }

  if (updates.tags) {
    updateData['metadata.tags'] = updates.tags;
  }

  if (updates.subChannel !== undefined) {
    updateData.subChannel = updates.subChannel || null;
  }

  if (updates.expiresAt) {
    updateData.expiresAt = Timestamp.fromDate(updates.expiresAt);
  }

  await updateDoc(postRef, updateData);
  toast.success('Scheduled post updated');
}