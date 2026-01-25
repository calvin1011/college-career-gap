
import type { MessageTag } from '@/types';

export type { MessageTag };

export interface User {
  uid: string;
  email: string;
  displayName: string;
  major: string;
  role: 'admin' | 'student';
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  admins: string[];
  memberCount: number;
}

export interface ExtensionUser {
  uid: string;
  email: string;
  displayName: string;
  major: string;
  role: 'admin' | 'student';
}

export interface ShareData {
  url: string;
  title: string;
  description?: string;
  selectedText?: string;
}

export interface PostData {
  channelId: string;
  content: string;
  tags: MessageTag[];
  subChannel?: string;
  customExpirationDate?: string;
}

export interface ExtensionStorage {
  authUser?: ExtensionUser;
  lastUsedChannel?: string;
  recentChannels?: string[];
}

export type StorageArea = 'local' | 'sync';

export interface ChromeStorageChange<T> {
  oldValue?: T;
  newValue?: T;
}