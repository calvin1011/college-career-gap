/**
 * ChannelService — unit tests for the key service functions.
 *
 * Strategy: mock firebase/firestore at the module level (SWC-safe: all
 * jest.fn() calls live inside factory bodies, never outside).  For functions
 * that use runTransaction we supply a synchronous fake transaction object.
 */

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db, name) => ({ __collection: name })),
  getDocs: jest.fn(),
  doc: jest.fn((firstArg, second, third) =>
    third !== undefined
      ? { __collection: second, __id: third }           // doc(db, 'col', 'id')
      : { __collection: (firstArg as any)?.__collection, __id: second } // doc(colRef, 'id')
  ),
  setDoc: jest.fn().mockResolvedValue(undefined),
  getDoc: jest.fn(),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  arrayUnion: jest.fn((...args: unknown[]) => ({ _type: 'arrayUnion', values: args })),
  arrayRemove: jest.fn((...args: unknown[]) => ({ _type: 'arrayRemove', values: args })),
  runTransaction: jest.fn(),
  increment: jest.fn((n: number) => ({ _type: 'increment', n })),
  addDoc: jest.fn().mockResolvedValue({ id: 'seed-msg-1' }),
  serverTimestamp: jest.fn().mockReturnValue({ _type: 'serverTimestamp' }),
  writeBatch: jest.fn(),
  query: jest.fn().mockReturnValue({ _type: 'query' }),
  where: jest.fn(),
  limit: jest.fn(),
}));

jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn().mockReturnValue({}),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

jest.mock('@/services/firebase/config', () => ({
  db: { __mock: 'db' },
  functions: {},
  storage: {},
  default: {},
}));

jest.mock('@/utils/validation', () => ({
  sanitizeMessageContent: jest.fn((c: string) => c),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  }),
}));

import {
  setDoc,
  getDoc,
  getDocs,
  runTransaction,
  arrayUnion,
  arrayRemove,
  updateDoc,
  addDoc,
} from 'firebase/firestore';
import toast from 'react-hot-toast';

import {
  findChannelByInviteCode,
  joinChannel,
  leaveChannel,
  seedChannels,
} from '@/components/channels/ChannelService';

// ── helpers ──────────────────────────────────────────────────────────────────

const mockSetDoc = setDoc as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;
const mockGetDocs = getDocs as jest.Mock;
const mockRunTransaction = runTransaction as jest.Mock;
const mockUpdateDoc = updateDoc as jest.Mock;
const mockAddDoc = addDoc as jest.Mock;
const mockToastSuccess = (toast as unknown as { success: jest.Mock }).success;
const mockToastError = (toast as unknown as { error: jest.Mock }).error;

/** A fake Firestore transaction object used for all runTransaction mocks. */
const mockTx = {
  get: jest.fn(),
  update: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};

/**
 * Configure `runTransaction` to synchronously call its callback with mockTx.
 * The callback itself is awaited, so the outer await still works.
 */
function setupTransaction() {
  mockRunTransaction.mockImplementation((_db: unknown, fn: (tx: typeof mockTx) => Promise<unknown>) =>
    fn(mockTx)
  );
}

/** Returns a mock channel document snapshot. */
function channelSnap(
  data: Record<string, unknown> = {},
  exists = true,
) {
  return {
    exists: () => exists,
    data: () => data,
    id: data.id ?? 'cs-channel',
  };
}

/** Returns a mock user document snapshot. */
function userSnap(
  data: Record<string, unknown> = {},
  exists = true,
) {
  return {
    exists: () => exists,
    data: () => data,
    id: data.uid ?? 'user-1',
  };
}

// ── setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  setupTransaction();
  mockSetDoc.mockResolvedValue(undefined);
  mockGetDoc.mockResolvedValue(channelSnap({}, false)); // default: doc doesn't exist
  mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
  mockUpdateDoc.mockResolvedValue(undefined);
  mockAddDoc.mockResolvedValue({ id: 'seed-msg-1' });
  mockTx.get.mockResolvedValue(channelSnap());
  mockTx.update.mockReturnValue(undefined);
});

// ── findChannelByInviteCode ───────────────────────────────────────────────────

describe('findChannelByInviteCode', () => {
  it('returns the channel when a matching invite code is found', async () => {
    const channelData = {
      name: 'Computer Science',
      inviteCode: 'CS_INVITE',
      members: [],
    };
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'computer-science', data: () => channelData }],
    });

    const result = await findChannelByInviteCode('CS_INVITE');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('computer-science');
    expect(result!.name).toBe('Computer Science');
  });

  it('returns null when no channel matches the invite code', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await findChannelByInviteCode('INVALID_CODE');

    expect(result).toBeNull();
  });
});

// ── joinChannel ───────────────────────────────────────────────────────────────

describe('joinChannel', () => {
  it('adds the user to channel.members via arrayUnion', async () => {
    // Channel exists, user not yet a member
    mockTx.get.mockImplementation((ref: { __collection: string }) => {
      if (ref.__collection === 'channels') {
        return Promise.resolve(channelSnap({ members: [], memberCount: 0 }));
      }
      return Promise.resolve(userSnap({ joinedChannels: [] }));
    });

    await joinChannel('computer-science', 'user-1');

    const channelUpdateCall = mockTx.update.mock.calls.find(
      ([ref]: [{ __collection: string }]) => ref.__collection === 'channels',
    );
    expect(channelUpdateCall).toBeDefined();
    expect(channelUpdateCall[1].members).toMatchObject({ _type: 'arrayUnion', values: ['user-1'] });
  });

  it('adds the channelId to user.joinedChannels via arrayUnion', async () => {
    mockTx.get.mockImplementation((ref: { __collection: string }) => {
      if (ref.__collection === 'channels') {
        return Promise.resolve(channelSnap({ members: [], memberCount: 0 }));
      }
      return Promise.resolve(userSnap({ joinedChannels: [] }));
    });

    await joinChannel('computer-science', 'user-1');

    const userUpdateCall = mockTx.update.mock.calls.find(
      ([ref]: [{ __collection: string }]) => ref.__collection === 'users',
    );
    expect(userUpdateCall).toBeDefined();
    expect(userUpdateCall[1].joinedChannels).toMatchObject({
      _type: 'arrayUnion',
      values: ['computer-science'],
    });
  });

  it('skips both updates when user is already a full member', async () => {
    // User is already in both channel.members and user.joinedChannels
    mockTx.get.mockImplementation((ref: { __collection: string }) => {
      if (ref.__collection === 'channels') {
        return Promise.resolve(channelSnap({ members: ['user-1'] }));
      }
      return Promise.resolve(userSnap({ joinedChannels: ['computer-science'] }));
    });

    await joinChannel('computer-science', 'user-1');

    // transaction.update should NOT have been called at all
    expect(mockTx.update).not.toHaveBeenCalled();
  });

  it('throws when the channel does not exist', async () => {
    mockTx.get.mockResolvedValue(channelSnap({}, false /* exists = false */));

    await expect(joinChannel('no-such-channel', 'user-1')).rejects.toThrow(
      /channel does not exist/i,
    );
  });

  it('throws when the user document does not exist', async () => {
    mockTx.get.mockImplementation((ref: { __collection: string }) => {
      if (ref.__collection === 'channels') {
        return Promise.resolve(channelSnap({ members: [] }));
      }
      return Promise.resolve(userSnap({}, false /* exists = false */));
    });

    await expect(joinChannel('computer-science', 'ghost-user')).rejects.toThrow(
      /user does not exist/i,
    );
  });
});

// ── leaveChannel ──────────────────────────────────────────────────────────────

describe('leaveChannel', () => {
  it('removes the user from channel.members via arrayRemove', async () => {
    mockTx.get.mockImplementation((ref: { __collection: string }) => {
      if (ref.__collection === 'channels') {
        return Promise.resolve(channelSnap({ members: ['user-1'] }));
      }
      return Promise.resolve(userSnap({ joinedChannels: ['computer-science'] }));
    });

    await leaveChannel('computer-science', 'user-1');

    const channelUpdateCall = mockTx.update.mock.calls.find(
      ([ref]: [{ __collection: string }]) => ref.__collection === 'channels',
    );
    expect(channelUpdateCall).toBeDefined();
    expect(channelUpdateCall[1].members).toMatchObject({ _type: 'arrayRemove', values: ['user-1'] });
  });

  it('removes the channelId from user.joinedChannels via arrayRemove', async () => {
    mockTx.get.mockImplementation((ref: { __collection: string }) => {
      if (ref.__collection === 'channels') {
        return Promise.resolve(channelSnap({ members: ['user-1'] }));
      }
      return Promise.resolve(userSnap({ joinedChannels: ['computer-science'] }));
    });

    await leaveChannel('computer-science', 'user-1');

    const userUpdateCall = mockTx.update.mock.calls.find(
      ([ref]: [{ __collection: string }]) => ref.__collection === 'users',
    );
    expect(userUpdateCall).toBeDefined();
    expect(userUpdateCall[1].joinedChannels).toMatchObject({
      _type: 'arrayRemove',
      values: ['computer-science'],
    });
  });

  it('throws when the user is not a member of the channel', async () => {
    mockTx.get.mockImplementation((ref: { __collection: string }) => {
      if (ref.__collection === 'channels') {
        // members list does NOT include 'user-1'
        return Promise.resolve(channelSnap({ members: ['other-user'] }));
      }
      return Promise.resolve(userSnap({ joinedChannels: ['computer-science'] }));
    });

    await expect(leaveChannel('computer-science', 'user-1')).rejects.toThrow(
      /not a member/i,
    );
  });

  it('throws when the channel does not exist', async () => {
    mockTx.get.mockResolvedValue(channelSnap({}, false));

    await expect(leaveChannel('no-such-channel', 'user-1')).rejects.toThrow(
      /channel does not exist/i,
    );
  });
});

// ── seedChannels ──────────────────────────────────────────────────────────────

describe('seedChannels', () => {
  it('calls setDoc with the correct channel shape for unseen majors', async () => {
    // All getDoc calls return non-existing docs so the channel gets created
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null, id: 'mock' });

    await seedChannels();

    // setDoc should have been called at least once (one per supported major)
    expect(mockSetDoc).toHaveBeenCalled();

    // Grab the first call and inspect the data
    const [, channelData] = mockSetDoc.mock.calls[0];
    expect(channelData).toMatchObject({
      name: expect.any(String),
      slug: expect.any(String),
      inviteCode: expect.any(String),
      members: [],
      admins: [],
      memberCount: 0,
    });
  });

  it('generates the inviteCode from the major initials', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null, id: 'mock' });

    await seedChannels();

    // Find the setDoc call for "Computer Science"
    const csCall = mockSetDoc.mock.calls.find(([, data]) => data.name === 'Computer Science');
    expect(csCall).toBeDefined();
    // "Computer Science" → initials "CS" → "CS_INVITE"
    expect(csCall![1].inviteCode).toBe('CS_INVITE');
  });

  it('skips channels that already exist', async () => {
    // All channels already exist — setDoc should never be called
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ name: 'Existing' }), id: 'mock' });

    await seedChannels();

    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('creates seed messages for a new channel', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null, id: 'mock' });

    await seedChannels();

    // addDoc is used to create seed messages
    expect(mockAddDoc).toHaveBeenCalled();
    const [, messageData] = mockAddDoc.mock.calls[0];
    expect(messageData).toMatchObject({
      authorId: 'system',
      type: 'text',
    });
  });
});
