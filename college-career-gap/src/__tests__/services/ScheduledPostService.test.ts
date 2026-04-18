/**
 * ScheduledPostService — unit tests.
 *
 * Focuses on what gets written to Firestore (shape, status, timestamps)
 * and how cancellation / updates mutate the document.
 */

jest.mock('firebase/firestore', () => {
  const timestampFromDate = jest.fn((d: Date) => ({ __ts: d.toISOString() }));
  const timestampNow = jest.fn(() => ({ __ts: 'now' }));
  const MockTimestamp = { fromDate: timestampFromDate, now: timestampNow };
  const module = {
    collection: jest.fn((_db: unknown, name: string) => ({ __collection: name })),
    doc: jest.fn((_colRef: unknown) => ({ __id: 'scheduled-post-id' })),
    setDoc: jest.fn().mockResolvedValue(undefined),
    getDoc: jest.fn(),
    updateDoc: jest.fn().mockResolvedValue(undefined),
    deleteDoc: jest.fn().mockResolvedValue(undefined),
    serverTimestamp: jest.fn(() => ({ __serverTimestamp: true })),
    Timestamp: MockTimestamp,
  };
  Object.assign(module, { __Timestamp: MockTimestamp });
  return module;
});

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

jest.mock('@/services/firebase/config', () => ({
  db: { __mock: 'db' },
  storage: { __mock: 'storage' },
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
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { sanitizeMessageContent } from '@/utils/validation';
import toast from 'react-hot-toast';

import {
  createScheduledPost,
  cancelScheduledPost,
  deleteScheduledPost,
  updateScheduledPost,
} from '@/services/ScheduledPostService';

// ── helpers ──────────────────────────────────────────────────────────────────

const mockSetDoc = setDoc as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;
const mockUpdateDoc = updateDoc as jest.Mock;
const mockDeleteDoc = deleteDoc as jest.Mock;
const mockSanitize = sanitizeMessageContent as jest.Mock;
const mockTimestampFromDate = (Timestamp as unknown as { fromDate: jest.Mock }).fromDate;
const mockToastSuccess = (toast as unknown as { success: jest.Mock }).success;

const author = { uid: 'prof-1', displayName: 'Prof. Adams' };
const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // one week ahead

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockSetDoc.mockResolvedValue(undefined);
  mockGetDoc.mockResolvedValue({
    id: 'scheduled-post-id',
    data: () => ({
      channelId: 'computer-science',
      authorId: 'prof-1',
      content: 'Test post',
      status: 'pending',
    }),
  });
  mockUpdateDoc.mockResolvedValue(undefined);
  mockDeleteDoc.mockResolvedValue(undefined);
  mockSanitize.mockImplementation((c: string) => c);
  // Restore Timestamp.fromDate implementation after clearAllMocks resets it
  mockTimestampFromDate.mockImplementation((d: Date) => ({ __ts: d.toISOString() }));
});

// ── createScheduledPost ───────────────────────────────────────────────────────

describe('createScheduledPost', () => {
  it('writes status: "pending" and the correct channelId', async () => {
    await createScheduledPost('computer-science', author, 'Hello students!', futureDate);

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, data] = mockSetDoc.mock.calls[0];
    expect(data.status).toBe('pending');
    expect(data.channelId).toBe('computer-science');
  });

  it('writes authorId and authorDisplayName', async () => {
    await createScheduledPost('computer-science', author, 'Hello!', futureDate);

    const [, data] = mockSetDoc.mock.calls[0];
    expect(data.authorId).toBe('prof-1');
    expect(data.authorDisplayName).toBe('Prof. Adams');
  });

  it('converts scheduledFor to a Firestore Timestamp', async () => {
    await createScheduledPost('computer-science', author, 'Hello!', futureDate);

    expect(mockTimestampFromDate).toHaveBeenCalledWith(futureDate);
    const [, data] = mockSetDoc.mock.calls[0];
    expect(data.scheduledFor).toEqual({ __ts: futureDate.toISOString() });
  });

  it('sanitizes the content before writing', async () => {
    mockSanitize.mockReturnValue('clean content');

    await createScheduledPost('computer-science', author, '<b>raw</b>', futureDate);

    const [, data] = mockSetDoc.mock.calls[0];
    expect(data.content).toBe('clean content');
  });

  it('sets expiresAt from a custom expiration date when tag is "internship"', async () => {
    const customExpiry = '2030-06-01';

    await createScheduledPost(
      'computer-science',
      author,
      'Internship alert!',
      futureDate,
      ['internship'],
      undefined,
      customExpiry,
    );

    const [, data] = mockSetDoc.mock.calls[0];
    expect(data.expiresAt).toBeDefined();
    // Timestamp.fromDate should have been called with the custom expiry date
    const expiryDateArg = mockTimestampFromDate.mock.calls.find(
      ([d]: [Date]) => d.toISOString().startsWith('2030-06-01'),
    );
    expect(expiryDateArg).toBeDefined();
  });

  it('sets expiresAt to scheduledFor + 7 days when internship tag but no custom date', async () => {
    await createScheduledPost(
      'computer-science',
      author,
      'Internship info',
      futureDate,
      ['internship'],
    );

    const [, data] = mockSetDoc.mock.calls[0];
    expect(data.expiresAt).toBeDefined();
    // The expiry should be ~7 days after futureDate
    const expectedExpiry = new Date(futureDate);
    expectedExpiry.setDate(expectedExpiry.getDate() + 7);
    const expiryCall = mockTimestampFromDate.mock.calls.find(
      ([d]: [Date]) => Math.abs(d.getTime() - expectedExpiry.getTime()) < 60_000,
    );
    expect(expiryCall).toBeDefined();
  });

  it('does NOT set expiresAt for non-expiring tags', async () => {
    await createScheduledPost(
      'computer-science',
      author,
      'General advice',
      futureDate,
      ['tips'],
    );

    const [, data] = mockSetDoc.mock.calls[0];
    expect(data.expiresAt).toBeUndefined();
  });

  it('includes metadata.tags when tags are provided', async () => {
    await createScheduledPost(
      'computer-science',
      author,
      'Hiring event',
      futureDate,
      ['event', 'full-time'],
    );

    const [, data] = mockSetDoc.mock.calls[0];
    expect(data.metadata.tags).toEqual(['event', 'full-time']);
  });

  it('returns the created document (id + data)', async () => {
    const result = await createScheduledPost('computer-science', author, 'Hello!', futureDate);

    expect(result).toMatchObject({
      id: 'scheduled-post-id',
      status: 'pending',
    });
  });
});

// ── cancelScheduledPost ───────────────────────────────────────────────────────

describe('cancelScheduledPost', () => {
  it('calls updateDoc with status: "cancelled"', async () => {
    await cancelScheduledPost('post-abc');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, update] = mockUpdateDoc.mock.calls[0];
    expect(update).toEqual({ status: 'cancelled' });
  });

  it('calls toast.success after cancelling', async () => {
    await cancelScheduledPost('post-abc');
    expect(mockToastSuccess).toHaveBeenCalled();
  });
});

// ── deleteScheduledPost ───────────────────────────────────────────────────────

describe('deleteScheduledPost', () => {
  it('calls deleteDoc on the correct document', async () => {
    await deleteScheduledPost('post-xyz');

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});

// ── updateScheduledPost ───────────────────────────────────────────────────────

describe('updateScheduledPost', () => {
  it('sanitizes updated content before writing', async () => {
    mockSanitize.mockReturnValue('sanitized content');

    await updateScheduledPost('post-1', { content: '<b>raw</b>' });

    const [, update] = mockUpdateDoc.mock.calls[0];
    expect(update.content).toBe('sanitized content');
  });

  it('converts a new scheduledFor date to a Timestamp', async () => {
    const newDate = new Date('2030-01-15T10:00:00Z');

    await updateScheduledPost('post-1', { scheduledFor: newDate });

    const [, update] = mockUpdateDoc.mock.calls[0];
    expect(update.scheduledFor).toEqual({ __ts: newDate.toISOString() });
    expect(mockTimestampFromDate).toHaveBeenCalledWith(newDate);
  });

  it('stores updated tags under metadata.tags', async () => {
    await updateScheduledPost('post-1', { tags: ['scholarship', 'event'] });

    const [, update] = mockUpdateDoc.mock.calls[0];
    expect(update['metadata.tags']).toEqual(['scholarship', 'event']);
  });

  it('stores subChannel as null when empty string is passed', async () => {
    await updateScheduledPost('post-1', { subChannel: '' });

    const [, update] = mockUpdateDoc.mock.calls[0];
    expect(update.subChannel).toBeNull();
  });
});
