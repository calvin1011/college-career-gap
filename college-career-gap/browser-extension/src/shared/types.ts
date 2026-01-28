export interface ExtensionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
}

export interface SubChannel {
  id: string;
  name: string;
  description?: string;
}

export type MessageTag =
  | 'general'
  | 'announcement'
  | 'opportunity'
  | 'resource'
  | 'event'
  | 'internship'
  | 'full-time'
  | 'scholarship';

export interface TagExpiration {
  [tag: string]: string;
}

export interface ShareData {
  url: string;
  title: string;
  description: string;
  selectedText: string;
}

export interface PostData {
  channelId: string;
  subChannelId?: string;
  content: string;
  tags: MessageTag[];
  tagExpirations?: TagExpiration;
  scheduledFor?: string;
  url?: string;
  linkTitle?: string;
  linkDescription?: string;
}