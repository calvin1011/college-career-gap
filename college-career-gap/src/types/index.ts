import { Timestamp, FieldValue } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  major: string;
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
  settings: {
    allowReactions: boolean;
    maxMessageLength: number;
    autoModeration: boolean;
  };
  members: string[]; // Added members
  createdAt: Date | Timestamp | FieldValue;
  updatedAt: Date | Timestamp | FieldValue;
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

export const DEFAULT_REACTIONS = ['👍', '❤️', '🔥', '💡', '🎯', '📖', '🚀'] as const;