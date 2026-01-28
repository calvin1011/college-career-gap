export interface ExtensionUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: 'admin' | 'student' | string;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  subChannels: string[];
  admins: string[];
  messageCount?: number;
}

export type MessageTag =
  | 'graduate'
  | 'undergrad'
  | 'podcast'
  | 'advice-tip'
  | 'internship'
  | 'full-time'
  | 'event'
  | 'scholarship';

export interface ShareData {
  url: string;
  title: string;
  description: string;
  selectedText: string;
}

export interface PostData {
  channelId: string;
  subChannel?: string;
  content: string;
  tags: MessageTag[];
  scheduledFor?: string;
  url?: string;
  linkTitle?: string;
  linkDescription?: string;
}