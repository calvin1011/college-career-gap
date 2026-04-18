/**
 * @jest-environment jsdom
 *
 * ScheduledPostModal — form validation and submission guard tests.
 *
 * We test the modal's client-side validation gates:
 *   - empty content + no files → error
 *   - missing date → error
 *   - missing time → error
 *   - past scheduled time → error
 *   - valid form → calls createScheduledPost with the right arguments
 *   - loading state → submit button disabled while submitting
 */

jest.mock('@/services/ScheduledPostService', () => ({
  createScheduledPost: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/hooks/useSubChannels', () => ({
  useSubChannels: jest.fn().mockReturnValue({
    subChannels: [],
    loading: false,
    hasSubChannels: false,
  }),
}));

// Stub out child components that aren't relevant to these tests
jest.mock('@/components/channels/TagSelector', () => ({
  TagSelector: () => null,
}));

jest.mock('@/components/channels/EmojiPicker', () => ({
  EmojiPicker: () => null,
}));

// Prevent Firebase from initialising
jest.mock('@/services/firebase/config', () => ({ auth: {}, db: {}, storage: {} }));
jest.mock('firebase/auth', () => ({}));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  Timestamp: { fromDate: jest.fn(d => d), now: jest.fn() },
}));
jest.mock('firebase/storage', () => ({}));
jest.mock('firebase/analytics', () => ({}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), {
    error: jest.fn(),
    success: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  }),
}));

// lucide-react icons work fine in jsdom — no mock needed

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import { createScheduledPost } from '@/services/ScheduledPostService';
import { ScheduledPostModal } from '@/components/channels/ScheduledPostModal';

const mockCreateScheduledPost = createScheduledPost as jest.Mock;
const mockToastError = (toast as unknown as { error: jest.Mock }).error;

const defaultProps = {
  channelId: 'computer-science',
  channelName: 'Computer Science',
  author: { uid: 'prof-1', displayName: 'Prof. Adams' },
  onClose: jest.fn(),
  onSuccess: jest.fn(),
};

// ── helpers ──────────────────────────────────────────────────────────────────

/** Returns a date/time string pair that is 1 hour in the future. */
function futureDateTimePair() {
  const future = new Date(Date.now() + 60 * 60 * 1000);
  const date = future.toISOString().split('T')[0];
  const time = future.toTimeString().slice(0, 5); // "HH:MM"
  return { date, time };
}

/** Returns a date/time string pair that is 1 hour in the past. */
function pastDateTimePair() {
  const past = new Date(Date.now() - 60 * 60 * 1000);
  const date = past.toISOString().split('T')[0];
  const time = past.toTimeString().slice(0, 5);
  return { date, time };
}

function renderModal(props = defaultProps) {
  return render(<ScheduledPostModal {...props} />);
}

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateScheduledPost.mockResolvedValue({});
});

// ── validation ────────────────────────────────────────────────────────────────

describe('ScheduledPostModal — validation', () => {
  it('shows an error when content is empty and no files are attached', () => {
    const { container } = renderModal();
    // Submit immediately with textarea blank — content validation fires before date/time checks
    fireEvent.submit(container.querySelector('form')!);

    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringMatching(/please enter content/i),
    );
    expect(mockCreateScheduledPost).not.toHaveBeenCalled();
  });

  it('shows an error when the date field is missing', () => {
    const { container } = renderModal();
    // Fill content but no date/time
    fireEvent.change(screen.getByPlaceholderText(/write your post/i), {
      target: { value: 'Some content' },
    });
    fireEvent.submit(container.querySelector('form')!);

    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringMatching(/please select date and time/i),
    );
    expect(mockCreateScheduledPost).not.toHaveBeenCalled();
  });

  it('shows an error when the time field is missing', () => {
    const { container } = renderModal();
    fireEvent.change(screen.getByPlaceholderText(/write your post/i), {
      target: { value: 'Some content' },
    });
    // Fill date but not time
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: futureDateTimePair().date } });
    fireEvent.submit(container.querySelector('form')!);

    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringMatching(/please select date and time/i),
    );
    expect(mockCreateScheduledPost).not.toHaveBeenCalled();
  });

  it('shows an error when the scheduled time is in the past', () => {
    const { container } = renderModal();
    const { date, time } = pastDateTimePair();

    fireEvent.change(screen.getByPlaceholderText(/write your post/i), {
      target: { value: 'Some content' },
    });
    fireEvent.change(container.querySelector('input[type="date"]')!, {
      target: { value: date },
    });
    fireEvent.change(container.querySelector('input[type="time"]')!, {
      target: { value: time },
    });
    fireEvent.submit(container.querySelector('form')!);

    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringMatching(/must be in the future/i),
    );
    expect(mockCreateScheduledPost).not.toHaveBeenCalled();
  });
});

// ── successful submission ─────────────────────────────────────────────────────

describe('ScheduledPostModal — successful submission', () => {
  it('calls createScheduledPost with channelId, author, content, and future date', async () => {
    const user = userEvent.setup();
    const { container } = renderModal();
    const { date, time } = futureDateTimePair();

    await user.type(screen.getByPlaceholderText(/write your post/i), 'Great internship!');
    fireEvent.change(container.querySelector('input[type="date"]')!, {
      target: { value: date },
    });
    fireEvent.change(container.querySelector('input[type="time"]')!, {
      target: { value: time },
    });

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(mockCreateScheduledPost).toHaveBeenCalledTimes(1));

    const [calledChannelId, calledAuthor, calledContent, calledDate] =
      mockCreateScheduledPost.mock.calls[0];
    expect(calledChannelId).toBe('computer-science');
    expect(calledAuthor).toEqual(defaultProps.author);
    expect(calledContent).toBe('Great internship!');
    expect(calledDate).toBeInstanceOf(Date);
    expect(calledDate.getTime()).toBeGreaterThan(Date.now());
  });

  it('calls onSuccess and onClose after a successful submit', async () => {
    const onClose = jest.fn();
    const onSuccess = jest.fn();
    const { container } = renderModal({ ...defaultProps, onClose, onSuccess });
    const { date, time } = futureDateTimePair();

    fireEvent.change(screen.getByPlaceholderText(/write your post/i), {
      target: { value: 'Hello!' },
    });
    fireEvent.change(container.querySelector('input[type="date"]')!, {
      target: { value: date },
    });
    fireEvent.change(container.querySelector('input[type="time"]')!, {
      target: { value: time },
    });
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── loading state ─────────────────────────────────────────────────────────────

describe('ScheduledPostModal — loading state', () => {
  it('disables the submit button while the post is being created', async () => {
    // Make createScheduledPost hang so we can inspect the loading state
    mockCreateScheduledPost.mockImplementation(() => new Promise(() => {}));
    const { container } = renderModal();
    const { date, time } = futureDateTimePair();

    fireEvent.change(screen.getByPlaceholderText(/write your post/i), {
      target: { value: 'Loading test' },
    });
    fireEvent.change(container.querySelector('input[type="date"]')!, {
      target: { value: date },
    });
    fireEvent.change(container.querySelector('input[type="time"]')!, {
      target: { value: time },
    });
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /schedule post/i }),
      ).toBeDisabled(),
    );
  });
});

// ── close button ──────────────────────────────────────────────────────────────

describe('ScheduledPostModal — close', () => {
  it('calls onClose when the X button is clicked', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    renderModal({ ...defaultProps, onClose });

    // The X button is the only button besides "Cancel" and "Schedule Post"
    const closeBtn = screen.getByRole('button', { name: '' });
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the Cancel button is clicked', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    renderModal({ ...defaultProps, onClose });

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
