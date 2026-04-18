/**
 * @jest-environment jsdom
 *
 * MessageItem — core content rendering.
 * Tests focus on: admin-gated controls (edit/pin/delete), pinned state,
 * and that the right handler is called when admin buttons are clicked.
 */

// Stub all sub-components so the heavy Firebase-dependent ones don't fire
jest.mock('@/hooks/useMessageViewTracking', () => ({
  useMessageViewTracking: () => ({ current: null }),
}));
jest.mock('@/components/channels/ExpirationBadge', () => ({
  ExpirationBadge: () => null,
}));
jest.mock('@/components/channels/TagBadge', () => ({
  TagBadge: () => null,
}));
jest.mock('@/components/channels/MessageContentRenderer', () => ({
  MessageContentRenderer: ({ content }: { content: string }) => (
    <span data-testid="msg-content">{content}</span>
  ),
}));
jest.mock('@/components/channels/LinkPreviewCard', () => ({
  LinkPreviewCard: () => null,
}));
jest.mock('@/components/channels/ReactionPanel', () => ({
  ReactionPanel: () => null,
}));
jest.mock('@/components/channels/MessageStats', () => ({
  MessageStats: () => null,
}));
jest.mock('@/components/channels/MessageAttachments', () => ({
  MessageAttachments: () => null,
}));
jest.mock('@/components/channels/BookmarkButton', () => ({
  BookmarkButton: () => null,
}));
// firebase/firestore is imported by the FieldValue/Timestamp type reference
jest.mock('firebase/firestore', () => ({}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageItem } from '@/components/channels/MessageItem';
import type { Message, User } from '@/types';

// ── fixtures ─────────────────────────────────────────────────────────────────

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    channelId: 'ch-1',
    authorId: 'author-1',
    authorDisplayName: 'Dr. Johnson',
    content: 'Great internship opportunity at Google\!',
    createdAt: new Date('2024-01-15') as unknown as Message['createdAt'],
    isPinned: false,
    isEdited: false,
    metadata: {},
    reactions: {},
    type: 'text',
    ...overrides,
  } as Message;
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'user-1',
    email: 'student@adams.edu',
    displayName: 'Alice',
    role: 'student',
    major: 'Computer Science',
    joinedChannels: ['computer-science'],
    ...overrides,
  } as User;
}

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    message: makeMessage(),
    user: makeUser(),
    isAdmin: false,
    moderationLoading: null,
    onTogglePin: jest.fn(),
    onDeleteMessage: jest.fn(),
    onEditMessage: jest.fn(),
    formatTimestamp: () => 'Jan 15, 2024',
    ...overrides,
  };
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('MessageItem — content rendering', () => {
  it('renders the message content', () => {
    render(<MessageItem {...baseProps()} />);
    expect(screen.getByTestId('msg-content')).toHaveTextContent(
      'Great internship opportunity at Google\!',
    );
  });

  it('renders the author display name', () => {
    render(<MessageItem {...baseProps()} />);
    expect(screen.getByText('Dr. Johnson')).toBeInTheDocument();
  });

  it('renders the formatted timestamp', () => {
    render(<MessageItem {...baseProps()} />);
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
  });

  it('renders author initial when no avatar is present', () => {
    render(<MessageItem {...baseProps({ message: makeMessage({ authorDisplayName: 'Bob' }) })} />);
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('renders "Adams State University" for system messages', () => {
    render(
      <MessageItem
        {...baseProps({ message: makeMessage({ authorId: 'system', authorDisplayName: 'System' }) })}
      />,
    );
    expect(screen.getByText('Adams State University')).toBeInTheDocument();
  });

  it('shows "(edited)" label when message has been edited', () => {
    render(
      <MessageItem {...baseProps({ message: makeMessage({ isEdited: true }) })} />,
    );
    expect(screen.getByText('(edited)')).toBeInTheDocument();
  });

  it('does NOT show "(edited)" for an unedited message', () => {
    render(<MessageItem {...baseProps()} />);
    expect(screen.queryByText('(edited)')).not.toBeInTheDocument();
  });
});

describe('MessageItem — pinned state', () => {
  it('shows "Pinned Resource" banner for a pinned message', () => {
    const props = baseProps({ message: makeMessage({ isPinned: true }) });
    render(<MessageItem {...props} />);
    expect(screen.getByText(/pinned resource/i)).toBeInTheDocument();
  });

  it('does NOT show "Pinned Resource" for an unpinned message', () => {
    render(<MessageItem {...baseProps()} />);
    expect(screen.queryByText(/pinned resource/i)).not.toBeInTheDocument();
  });

  it('applies blue background class to a pinned message', () => {
    const props = baseProps({ message: makeMessage({ isPinned: true }) });
    const { container } = render(<MessageItem {...props} />);
    expect(container.firstChild).toHaveClass('bg-blue-50');
  });

  it('applies white background class to an unpinned message', () => {
    const { container } = render(<MessageItem {...baseProps()} />);
    expect(container.firstChild).toHaveClass('bg-white');
  });
});

describe('MessageItem — sub-channel badge', () => {
  it('renders a sub-channel badge when subChannel is set', () => {
    const msg = makeMessage({ subChannel: 'Software Engineering' });
    render(<MessageItem {...baseProps({ message: msg })} />);
    expect(screen.getByText('Software Engineering')).toBeInTheDocument();
  });

  it('does not render a sub-channel badge when subChannel is absent', () => {
    render(<MessageItem {...baseProps()} />);
    // No badge rendered — just verify no spurious text
    expect(screen.queryByText('Software Engineering')).not.toBeInTheDocument();
  });
});

describe('MessageItem — admin controls', () => {
  it('renders edit, pin, and delete buttons for admins', () => {
    const props = baseProps({ isAdmin: true });
    render(<MessageItem {...props} />);
    // 3 icon buttons inside the admin controls section
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it('renders NO action buttons for non-admins', () => {
    render(<MessageItem {...baseProps({ isAdmin: false })} />);
    // BookmarkButton is mocked away; no other buttons should appear
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('calls onEditMessage with the message when the first admin button is clicked', () => {
    const onEdit = jest.fn();
    const message = makeMessage();
    const props = baseProps({ isAdmin: true, message, onEditMessage: onEdit });
    render(<MessageItem {...props} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]); // edit is first
    expect(onEdit).toHaveBeenCalledWith(message);
  });

  it('calls onTogglePin with the message when the second admin button is clicked', () => {
    const onPin = jest.fn();
    const message = makeMessage();
    const props = baseProps({ isAdmin: true, message, onTogglePin: onPin });
    render(<MessageItem {...props} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // pin is second
    expect(onPin).toHaveBeenCalledWith(message);
  });

  it('calls onDeleteMessage with the message when the third admin button is clicked', () => {
    const onDelete = jest.fn();
    const message = makeMessage();
    const props = baseProps({ isAdmin: true, message, onDeleteMessage: onDelete });
    render(<MessageItem {...props} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]); // delete is third
    expect(onDelete).toHaveBeenCalledWith(message);
  });

  it('disables pin and delete buttons while moderationLoading matches the message id', () => {
    const props = baseProps({ isAdmin: true, moderationLoading: 'msg-1' });
    render(<MessageItem {...props} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[1]).toBeDisabled(); // pin
    expect(buttons[2]).toBeDisabled(); // delete
  });

  it('does NOT disable buttons when moderationLoading is for a different message', () => {
    const props = baseProps({ isAdmin: true, moderationLoading: 'other-msg-id' });
    render(<MessageItem {...props} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[1]).not.toBeDisabled();
    expect(buttons[2]).not.toBeDisabled();
  });
});
