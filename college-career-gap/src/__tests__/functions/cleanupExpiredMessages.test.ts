/**
 * cleanupExpiredMessages — Cloud Function unit tests.
 *
 * The function lives in src/functions/index.js (CommonJS, firebase-admin).
 * We mock every dependency so the handler can be loaded and called directly
 * without a real Firebase project.
 *
 * Key trick: `onSchedule` is mocked to return its handler function directly,
 * so `exports.cleanupExpiredMessages` becomes the async handler we can await.
 *
 * firebase-functions/* live only in src/functions/node_modules (not project
 * root), so those mocks need `{ virtual: true }`.
 */

// ── firebase-admin mocks (packages exist in project root node_modules) ────────

jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: jest.fn().mockReturnValue({ sendEachForMulticast: jest.fn() }),
}));

// firebase-admin/firestore is the heart of the tests.
// We stash the mock objects on the exported module so tests can access them
// via the import (same pattern as the Resend __sendFn stash).
jest.mock('firebase-admin/firestore', () => {
  const batch = {
    delete: jest.fn(),
    update: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  };
  const collRef = {
    where: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ size: 0, docs: [] }),
    doc: jest.fn().mockReturnThis(),
    add: jest.fn().mockResolvedValue({ id: 'log-1' }),
  };
  const db = {
    collection: jest.fn().mockReturnValue(collRef),
    batch: jest.fn().mockReturnValue(batch),
  };
  const FieldValue = {
    serverTimestamp: jest.fn(() => '__serverTimestamp__'),
    increment: jest.fn((n: number) => `__increment(${n})__`),
    delete: jest.fn(() => '__delete__'),
  };
  const MockModule = {
    getFirestore: jest.fn().mockReturnValue(db),
    FieldValue,
  };
  Object.assign(MockModule, { __db: db, __batch: batch, __collRef: collRef });
  return MockModule;
});

// ── firebase-functions mocks (virtual — not in project root node_modules) ─────

jest.mock(
  'firebase-functions/v2/scheduler',
  () => ({
    // Return the handler directly so exports.cleanupExpiredMessages IS the handler
    onSchedule: jest.fn((_schedule: string, handler: (...args: unknown[]) => unknown) => handler),
  }),
  { virtual: true },
);

jest.mock(
  'firebase-functions/v2/firestore',
  () => ({
    onDocumentCreated: jest.fn(() => null),
    onDocumentUpdated: jest.fn(() => null),
  }),
  { virtual: true },
);

jest.mock(
  'firebase-functions/v2/https',
  () => ({
    onRequest: jest.fn(() => null),
    onCall: jest.fn(() => null),
    HttpsError: class HttpsError extends Error {
      constructor(public code: string, message: string) { super(message); }
    },
  }),
  { virtual: true },
);

jest.mock(
  'firebase-functions',
  () => ({}),
  { virtual: true },
);

// ── load the function under test ──────────────────────────────────────────────

import * as adminFirestore from 'firebase-admin/firestore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { __db: mockDb, __batch: mockBatch, __collRef: mockCollRef } = adminFirestore as any;

// Load the functions module inside beforeAll so it runs AFTER all jest.mock()
// registrations are hoisted.  A top-level require() would execute before SWC
// hoists jest.mock(), causing the real firebase-admin to load.
let cleanupExpiredMessages: (ctx?: unknown) => Promise<unknown>;

// ── helpers ───────────────────────────────────────────────────────────────────

/** Creates a mock Firestore doc that looks like an expired message. */
function makeExpiredDoc(
  id: string,
  channelId: string,
  tag = 'internship',
): Record<string, unknown> {
  return {
    id,
    ref: { id, __docRef: true },
    data: () => ({
      channelId,
      content: 'Internship opportunity at ACME Corp — apply before the deadline!',
      expiresAt: {
        toDate: () => new Date('2020-01-01'),
      },
      metadata: { tags: [tag] },
    }),
  };
}

// ── setup ─────────────────────────────────────────────────────────────────────

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  cleanupExpiredMessages = require('../../functions/index').cleanupExpiredMessages;
});

beforeEach(() => {
  jest.clearAllMocks();
  // Restore default resolutions after clearAllMocks wipes them
  mockBatch.commit.mockResolvedValue(undefined);
  mockCollRef.get.mockResolvedValue({ size: 0, docs: [] });
  mockCollRef.where.mockReturnThis();
  mockCollRef.add.mockResolvedValue({ id: 'log-1' });
  mockDb.collection.mockReturnValue(mockCollRef);
  mockDb.batch.mockReturnValue(mockBatch);
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('cleanupExpiredMessages', () => {
  it('returns success with totalDeleted: 0 when there are no expired messages', async () => {
    mockCollRef.get.mockResolvedValueOnce({ size: 0, docs: [] });

    const result = await cleanupExpiredMessages({}) as Record<string, unknown>;

    expect(result).toMatchObject({ success: true, totalDeleted: 0 });
    // batch.commit should never be called — no documents to delete
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it('calls batch.delete for each expired message', async () => {
    const docs = [
      makeExpiredDoc('msg-1', 'computer-science', 'internship'),
      makeExpiredDoc('msg-2', 'business', 'full-time'),
    ];
    mockCollRef.get.mockResolvedValueOnce({ size: 2, docs });

    await cleanupExpiredMessages({});

    expect(mockBatch.delete).toHaveBeenCalledTimes(2);
    expect(mockBatch.delete).toHaveBeenCalledWith(docs[0].ref);
    expect(mockBatch.delete).toHaveBeenCalledWith(docs[1].ref);
  });

  it('commits the batch after queuing all deletes', async () => {
    const docs = [makeExpiredDoc('msg-1', 'computer-science')];
    mockCollRef.get.mockResolvedValueOnce({ size: 1, docs });

    await cleanupExpiredMessages({});

    // One batch for message deletes + one for channel count updates = 2 commits
    expect(mockBatch.commit).toHaveBeenCalledTimes(2);
  });

  it('returns the correct totalDeleted count', async () => {
    const docs = [
      makeExpiredDoc('msg-1', 'computer-science'),
      makeExpiredDoc('msg-2', 'computer-science'),
      makeExpiredDoc('msg-3', 'business'),
    ];
    mockCollRef.get.mockResolvedValueOnce({ size: 3, docs });

    const result = await cleanupExpiredMessages({}) as Record<string, unknown>;

    expect(result).toMatchObject({ success: true, totalDeleted: 3 });
  });

  it('updates message counts for all affected channels', async () => {
    // Two messages from 'computer-science', one from 'business'
    const docs = [
      makeExpiredDoc('msg-1', 'computer-science'),
      makeExpiredDoc('msg-2', 'computer-science'),
      makeExpiredDoc('msg-3', 'business'),
    ];
    mockCollRef.get.mockResolvedValueOnce({ size: 3, docs });

    await cleanupExpiredMessages({});

    // batch.update should be called once per affected channel (2 channels)
    expect(mockBatch.update).toHaveBeenCalledTimes(2);
  });

  it('saves a cleanup_logs document when messages were deleted', async () => {
    const docs = [makeExpiredDoc('msg-1', 'computer-science')];
    mockCollRef.get.mockResolvedValueOnce({ size: 1, docs });

    await cleanupExpiredMessages({});

    expect(mockCollRef.add).toHaveBeenCalledTimes(1);
    const [logData] = mockCollRef.add.mock.calls[0];
    expect(logData).toMatchObject({ totalDeleted: 1 });
  });

  it('does NOT save a cleanup_log when there are no expired messages', async () => {
    mockCollRef.get.mockResolvedValueOnce({ size: 0, docs: [] });

    await cleanupExpiredMessages({});

    expect(mockCollRef.add).not.toHaveBeenCalled();
  });

  it('reports the correct number of channels affected', async () => {
    const docs = [
      makeExpiredDoc('msg-1', 'computer-science'),
      makeExpiredDoc('msg-2', 'biology'), // separate channel
    ];
    mockCollRef.get.mockResolvedValueOnce({ size: 2, docs });

    const result = await cleanupExpiredMessages({}) as Record<string, unknown>;

    expect(result).toMatchObject({ channelsAffected: 2 });
  });
});
