import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  major: string;
  role: 'admin' | 'student';
  isVerified: boolean;
  joinedChannels: string[];
  createdAt: Date | Timestamp;
  lastActiveAt: Date | Timestamp;
  profile: {
    avatar?: string;
    bio?: string;
    graduationYear?: number;
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
  settings: {
    allowReactions: boolean;
    maxMessageLength: number;
    autoModeration: boolean;
  };
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  type: 'text' | 'link' | 'media';
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
  editedAt?: Date | Timestamp;
  createdAt: Date | Timestamp;
}

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image?: string;
  domain: string;
}

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

export const DEFAULT_REACTIONS = ['👍', '❤️', '🔥', '💡', '🎯', '📖', '🚀'] as const;