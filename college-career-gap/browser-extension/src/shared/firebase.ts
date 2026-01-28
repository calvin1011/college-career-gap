// REST-based Firebase helpers for MV3 (no remote JS)
declare const process: {
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY?: string;
    NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string;
  };
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
};

const IDENTITY_BASE = 'https://identitytoolkit.googleapis.com/v1';
const TOKEN_BASE = 'https://securetoken.googleapis.com/v1';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)`;

type FirestoreField =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreField[] } }
  | { mapValue: { fields?: Record<string, FirestoreField> } };

export interface StoredSession {
  uid: string;
  email: string;
  displayName: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface ExtensionProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: 'admin' | 'student' | string;
}

export interface ExtensionChannel {
  id: string;
  name: string;
  slug: string;
  subChannels: string[];
  admins: string[];
  messageCount?: number;
}

export async function signInExtension(email: string, password: string): Promise<StoredSession> {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Missing Firebase config for extension.');
  }

  const response = await fetch(`${IDENTITY_BASE}/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || 'Failed to sign in.');
  }

  const data = await response.json();
  const expiresIn = Number(data.expiresIn || 0);
  const session: StoredSession = {
    uid: data.localId,
    email: data.email,
    displayName: data.displayName || data.email,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  await chrome.storage.local.set({ authSession: session });
  return session;
}

export async function signOutExtension(): Promise<void> {
  await chrome.storage.local.remove(['authSession', 'authProfile']);
}

export async function getStoredSession(): Promise<StoredSession | null> {
  const result = await chrome.storage.local.get('authSession');
  return result.authSession || null;
}

async function refreshIdToken(refreshToken: string): Promise<StoredSession> {
  const response = await fetch(`${TOKEN_BASE}/token?key=${firebaseConfig.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh session.');
  }

  const data = await response.json();
  const expiresIn = Number(data.expires_in || 0);

  return {
    uid: data.user_id,
    email: '',
    displayName: '',
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

export async function ensureValidSession(): Promise<StoredSession | null> {
  const session = await getStoredSession();
  if (!session) return null;

  if (session.expiresAt - Date.now() > 60_000) {
    return session;
  }

  const refreshed = await refreshIdToken(session.refreshToken);
  const updated: StoredSession = {
    ...session,
    idToken: refreshed.idToken,
    refreshToken: refreshed.refreshToken,
    expiresAt: refreshed.expiresAt,
  };

  await chrome.storage.local.set({ authSession: updated });
  return updated;
}

function fromFirestoreField(field: FirestoreField): any {
  if ('stringValue' in field) return field.stringValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return field.doubleValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) {
    return (field.arrayValue.values || []).map(fromFirestoreField);
  }
  if ('mapValue' in field) {
    const fields = field.mapValue.fields || {};
    return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFirestoreField(value)]));
  }
  return null;
}

function toFirestoreField(value: any): FirestoreField | null {
  if (value === undefined) return null;
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => toFirestoreField(item)).filter(Boolean) as FirestoreField[],
      },
    };
  }
  if (typeof value === 'object') {
    const fields: Record<string, FirestoreField> = {};
    Object.entries(value).forEach(([key, val]) => {
      const fieldValue = toFirestoreField(val);
      if (fieldValue) fields[key] = fieldValue;
    });
    return { mapValue: { fields } };
  }
  return null;
}

function toFirestoreFields(value: Record<string, any>): Record<string, FirestoreField> {
  const fields: Record<string, FirestoreField> = {};
  Object.entries(value).forEach(([key, val]) => {
    const fieldValue = toFirestoreField(val);
    if (fieldValue) fields[key] = fieldValue;
  });
  return fields;
}

async function firestoreRequest<T>(path: string, idToken: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${FIRESTORE_BASE}/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || 'Firestore request failed.');
  }

  return response.json() as Promise<T>;
}

export async function fetchUserProfile(session: StoredSession): Promise<ExtensionProfile | null> {
  const data = await firestoreRequest<{ fields?: Record<string, FirestoreField> }>(`documents/users/${session.uid}`, session.idToken);
  if (!data?.fields) return null;

  const profile = fromFirestoreField({ mapValue: { fields: data.fields } });
  const displayName = profile.displayName || session.displayName || session.email;
  const photoURL = profile.profile?.avatar || null;

  const userProfile: ExtensionProfile = {
    uid: session.uid,
    email: profile.email || session.email,
    displayName,
    photoURL,
    role: profile.role || 'student',
  };

  await chrome.storage.local.set({ authProfile: userProfile });
  return userProfile;
}

export async function getCachedProfile(): Promise<ExtensionProfile | null> {
  const result = await chrome.storage.local.get('authProfile');
  return result.authProfile || null;
}

export async function fetchAdminChannels(session: StoredSession): Promise<ExtensionChannel[]> {
  const payload = {
    structuredQuery: {
      from: [{ collectionId: 'channels' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'admins' },
          op: 'ARRAY_CONTAINS',
          value: { stringValue: session.uid },
        },
      },
    },
  };

  const response = await firestoreRequest<Array<{ document?: { name: string; fields?: Record<string, FirestoreField> } }>>(
    'documents:runQuery',
    session.idToken,
    { method: 'POST', body: JSON.stringify(payload) }
  );

  const channels: ExtensionChannel[] = [];

  response.forEach((entry) => {
    if (!entry.document?.fields) return;
    const data = fromFirestoreField({ mapValue: { fields: entry.document.fields } });
    const name = data.name || '';
    const slug = data.slug || '';
    const docId = entry.document.name.split('/').pop() || slug || name;
    channels.push({
      id: docId,
      name,
      slug,
      subChannels: Array.isArray(data.subChannels) ? data.subChannels : [],
      admins: Array.isArray(data.admins) ? data.admins : [],
      messageCount: typeof data.messageCount === 'number' ? data.messageCount : undefined,
    });
  });

  return channels;
}

export async function fetchAllChannels(session: StoredSession): Promise<ExtensionChannel[]> {
  const response = await firestoreRequest<{
    documents?: Array<{ name: string; fields?: Record<string, FirestoreField> }>;
  }>(`documents/channels?pageSize=500`, session.idToken);

  return (response.documents || []).map((doc) => {
    const data = fromFirestoreField({ mapValue: { fields: doc.fields || {} } });
    const docId = doc.name.split('/').pop() || data.slug || data.name;
    return {
      id: docId,
      name: data.name || '',
      slug: data.slug || '',
      subChannels: Array.isArray(data.subChannels) ? data.subChannels : [],
      admins: Array.isArray(data.admins) ? data.admins : [],
      messageCount: typeof data.messageCount === 'number' ? data.messageCount : undefined,
    };
  });
}

export function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface CreateMessageInput {
  channelId: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatar?: string | null;
  content: string;
  tags: string[];
  subChannel?: string | null;
  expiresAt?: Date;
  link?: { url: string; title?: string; description?: string };
  currentMessageCount?: number;
}

export async function createMessage(session: StoredSession, input: CreateMessageInput): Promise<void> {
  const messageId = generateId();
  const messageFields = toFirestoreFields({
    channelId: input.channelId,
    authorId: input.authorId,
    authorDisplayName: input.authorDisplayName,
    ...(input.authorAvatar ? { authorAvatar: input.authorAvatar } : {}),
    content: input.content,
    type: input.link?.url ? 'link' : 'text',
    clickCount: 0,
    reactions: {},
    isPinned: false,
    isEdited: false,
    createdAt: new Date(),
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    ...(input.subChannel ? { subChannel: input.subChannel } : {}),
    metadata: {
      ...(input.tags.length > 0 ? { tags: input.tags } : {}),
      ...(input.link?.url
        ? {
            links: [
              {
                url: input.link.url,
                title: input.link.title || '',
                description: input.link.description || '',
                domain: getDomainFromUrl(input.link.url),
              },
            ],
          }
        : {}),
    },
  });

  await firestoreRequest(`documents/messages?documentId=${messageId}`, session.idToken, {
    method: 'POST',
    body: JSON.stringify({ fields: messageFields }),
  });

  const nextCount = typeof input.currentMessageCount === 'number'
    ? input.currentMessageCount + 1
    : undefined;

  if (nextCount !== undefined) {
    const channelFields = toFirestoreFields({
      messageCount: nextCount,
      updatedAt: new Date(),
    });

    await firestoreRequest(
      `documents/channels/${input.channelId}?updateMask.fieldPaths=messageCount&updateMask.fieldPaths=updatedAt`,
      session.idToken,
      {
        method: 'PATCH',
        body: JSON.stringify({ fields: channelFields }),
      }
    );
  }
}

interface CreateScheduledPostInput {
  channelId: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatar?: string | null;
  content: string;
  tags: string[];
  subChannel?: string | null;
  scheduledFor: Date;
  expiresAt?: Date;
  link?: { url: string; title?: string; description?: string };
}

export async function createScheduledPost(session: StoredSession, input: CreateScheduledPostInput): Promise<void> {
  const scheduledId = generateId();
  const postFields = toFirestoreFields({
    channelId: input.channelId,
    authorId: input.authorId,
    authorDisplayName: input.authorDisplayName,
    ...(input.authorAvatar ? { authorAvatar: input.authorAvatar } : {}),
    content: input.content,
    scheduledFor: input.scheduledFor,
    status: 'pending',
    createdAt: new Date(),
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    ...(input.subChannel ? { subChannel: input.subChannel } : {}),
    metadata: {
      ...(input.tags.length > 0 ? { tags: input.tags } : {}),
      ...(input.link?.url
        ? {
            links: [
              {
                url: input.link.url,
                title: input.link.title || '',
                description: input.link.description || '',
                domain: getDomainFromUrl(input.link.url),
              },
            ],
          }
        : {}),
    },
  });

  await firestoreRequest(`documents/scheduledPosts?documentId=${scheduledId}`, session.idToken, {
    method: 'POST',
    body: JSON.stringify({ fields: postFields }),
  });
}