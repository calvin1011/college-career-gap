import { Timestamp, FieldValue } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  major: string;
  subChannel?: string;
  role: 'admin' | 'student';
  isVerified: boolean;
  joinedChannels: string[];
  createdAt: Date | Timestamp | FieldValue;
  lastActiveAt: Date | Timestamp | FieldValue;
  notificationToken?: string;
  profile: {
    avatar?: string;
    bio?: string;
    graduationYear?: number;
    university?: string;
  };
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description: string;
  majorCode: string;
  color: string;
  admins: string[];
  memberCount: number;
  messageCount: number;
  inviteCode: string;
  qrCodeData?: string;
  parentChannel?: string;
  subChannels?: string[]; // Now dynamically managed by admins
  settings: {
    allowReactions: boolean;
    maxMessageLength: number;
    autoModeration: boolean;
  };
  members: string[];
  createdAt: Date | Timestamp | FieldValue;
  updatedAt: Date | Timestamp | FieldValue;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  type: 'text' | 'link' | 'media';
  subChannel?: string;
  metadata?: {
    links?: LinkPreview[];
    media?: MediaAttachment[];
    tags?: string[];
  };
  reactions: {
    [emoji: string]: string[];
  };
  isPinned: boolean;
  isEdited: boolean;
  editedAt?: Date | Timestamp | FieldValue;
  createdAt: Date | Timestamp | FieldValue;
}

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image?: string;
  domain: string;
}

export const MESSAGE_TAGS = [
  'podcast',
  'advice-tip',
  'internship',
  'full-time'
] as const;

export type MessageTag = typeof MESSAGE_TAGS[number];

export const TAG_CONFIG: Record<MessageTag, { label: string; color: string; bgColor: string; borderColor: string }> = {
  'podcast': {
    label: '🎙️ Podcast',
    color: 'text-pink-700',
    bgColor: 'bg-pink-100',
    borderColor: 'border-pink-400'
  },
  'advice-tip': {
    label: '💡 Advice/Tips',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300'
  },
  'internship': {
    label: '🎓 Internship',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300'
  },
  'full-time': {
    label: '💼 Full Time',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-400'
  }
};

export interface MediaAttachment {
  url: string;
  type: 'image' | 'video' | 'document';
  name: string;
  size: number;
}

export interface Invite {
  id: string;
  channelId: string;
  code: string;
  createdBy: string;
  usageCount: number;
  maxUses?: number;
  expiresAt?: Date | Timestamp;
  isActive: boolean;
  createdAt: Date | Timestamp;
}

export interface ReactionMap {
  [emoji: string]: string[];
}

export const SUPPORTED_MAJORS = [
  'Business',
  'Computer Science',
  'Biology',
  'Chemistry',
  'Psychology',
  'Kinesiology'
] as const;

export type Major = typeof SUPPORTED_MAJORS[number];

// REMOVED: Hardcoded sub-channels - now dynamic from Firestore
// Sub-channels are now stored in the Channel document's subChannels array

/**
 * Checks if a major has sub-channels configured.
 * This now queries Firestore instead of using hardcoded data.
 */
export async function hasSubChannels(major: string): Promise<boolean> {
  try {
    const slug = major.toLowerCase().replace(/\s/g, '-');
    const channelRef = doc(db, 'channels', slug);
    const channelDoc = await getDoc(channelRef);

    if (!channelDoc.exists()) return false;

    const subChannels = channelDoc.data()?.subChannels || [];
    return subChannels.length > 0;
  } catch (error) {
    console.error('Error checking sub-channels:', error);
    return false;
  }
}

/**
 * Gets sub-channels for a major from Firestore.
 * Returns an empty array if none exist.
 */
export async function getSubChannelsForMajor(major: string): Promise<string[]> {
  try {
    const slug = major.toLowerCase().replace(/\s/g, '-');
    const channelRef = doc(db, 'channels', slug);
    const channelDoc = await getDoc(channelRef);

    if (!channelDoc.exists()) return [];

    return channelDoc.data()?.subChannels || [];
  } catch (error) {
    console.error('Error fetching sub-channels:', error);
    return [];
  }
}

/**
 * Synchronous version that checks if a major string matches known majors with sub-channels.
 * Use this for initial UI rendering, then fetch actual sub-channels asynchronously.
 */
export function hasSubChannelsSync(major: string): boolean {
  // Based on your current setup, Business and Computer Science have sub-channels
  // This is a temporary helper until all components are updated to use async
  const majorsWithSubChannels = ['Business', 'Computer Science'];
  return majorsWithSubChannels.includes(major);
}

export const DEFAULT_REACTIONS = ['👍', '❤️', '🔥', '💡', '🎯', '📖', '🚀'] as const;