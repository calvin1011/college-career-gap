/**
 * @jest-environment jsdom
 *
 * DashboardLayout — the navigation guard for all protected routes.
 * Critical: unauthenticated users must be redirected, unverified users
 * must see the verification wall, and only fully-authenticated users
 * see the dashboard shell.
 */

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks/useAnnouncements', () => ({
  useAnnouncements: () => ({ currentAnnouncement: null, dismissAnnouncement: jest.fn() }),
}));

// Stub heavy child components so their own Firebase deps don't fire
jest.mock('@/components/layout/Header', () =>
  function MockHeader({ onMenuClick }: { onMenuClick: () => void }) {
    return <div data-testid="header" onClick={onMenuClick} />;
  },
);
jest.mock('@/components/layout/Sidebar', () =>
  function MockSidebar() {
    return <div data-testid="sidebar" />;
  },
);
jest.mock('@/components/feedback/FeedbackModal', () =>
  function MockFeedback() {
    return <div data-testid="feedback-modal" />;
  },
);
jest.mock('@/components/announcements/AnnouncementModal', () =>
  function MockAnnouncement() {
    return <div data-testid="announcement-modal" />;
  },
);

// Firebase auth used for the "Go to Sign In" button on the verification wall
jest.mock('@/services/firebase/config', () => ({
  auth: { signOut: jest.fn().mockResolvedValue(undefined) },
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/app/dashboard/layout';

const mockUseAuth = useAuth as jest.Mock;

// ── helpers ──────────────────────────────────────────────────────────────────

function renderLayout(children = <span data-testid="page-content">Content</span>) {
  return render(<DashboardLayout>{children}</DashboardLayout>);
}

// ── tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DashboardLayout — loading state', () => {
  it('shows a loading spinner while auth is being determined', () => {
    mockUseAuth.mockReturnValue({ firebaseUser: null, loading: true });
    renderLayout();
    // The spinner has the animate-spin class
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByTestId('page-content')).not.toBeInTheDocument();
  });

  it('shows spinner when firebaseUser is present but loading is still true', () => {
    mockUseAuth.mockReturnValue({
      firebaseUser: { uid: 'u1', emailVerified: true },
      loading: true,
    });
    renderLayout();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });
});

describe('DashboardLayout — unauthenticated redirect', () => {
  it('redirects to "/" when loading is false and no firebaseUser', async () => {
    mockUseAuth.mockReturnValue({ firebaseUser: null, loading: false });
    renderLayout();

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  it('does NOT render page content for unauthenticated users', () => {
    mockUseAuth.mockReturnValue({ firebaseUser: null, loading: false });
    renderLayout();
    expect(screen.queryByTestId('page-content')).not.toBeInTheDocument();
  });
});

describe('DashboardLayout — email verification wall', () => {
  const unverifiedUser = {
    uid: 'u2',
    email: 'student@adams.edu',
    emailVerified: false,
  };

  it('shows "Please Verify Your Email" heading for an unverified user', () => {
    mockUseAuth.mockReturnValue({ firebaseUser: unverifiedUser, loading: false });
    renderLayout();
    expect(screen.getByText(/please verify your email/i)).toBeInTheDocument();
  });

  it('shows the user email on the verification prompt', () => {
    mockUseAuth.mockReturnValue({ firebaseUser: unverifiedUser, loading: false });
    renderLayout();
    expect(screen.getByText(/student@adams\.edu/)).toBeInTheDocument();
  });

  it('shows a "Professors: Request admin access" link on the verification wall', () => {
    mockUseAuth.mockReturnValue({ firebaseUser: unverifiedUser, loading: false });
    renderLayout();
    expect(screen.getByText(/request admin access/i)).toBeInTheDocument();
  });

  it('does NOT render child page content for unverified users', () => {
    mockUseAuth.mockReturnValue({ firebaseUser: unverifiedUser, loading: false });
    renderLayout();
    expect(screen.queryByTestId('page-content')).not.toBeInTheDocument();
  });

  it('does NOT redirect to "/" for unverified users', async () => {
    mockUseAuth.mockReturnValue({ firebaseUser: unverifiedUser, loading: false });
    renderLayout();
    // Let effects settle
    await new Promise(r => setTimeout(r, 0));
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('DashboardLayout — authenticated and verified', () => {
  const verifiedUser = {
    uid: 'u3',
    email: 'student@adams.edu',
    emailVerified: true,
  };

  it('renders the Sidebar and Header for a verified user', () => {
    mockUseAuth.mockReturnValue({ firebaseUser: verifiedUser, loading: false });
    renderLayout();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('renders child page content for a verified user', () => {
    mockUseAuth.mockReturnValue({ firebaseUser: verifiedUser, loading: false });
    renderLayout();
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });

  it('does NOT redirect a verified user', async () => {
    mockUseAuth.mockReturnValue({ firebaseUser: verifiedUser, loading: false });
    renderLayout();
    await new Promise(r => setTimeout(r, 0));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does NOT show the verification prompt for a verified user', () => {
    mockUseAuth.mockReturnValue({ firebaseUser: verifiedUser, loading: false });
    renderLayout();
    expect(screen.queryByText(/please verify your email/i)).not.toBeInTheDocument();
  });

  it('renders a floating feedback button', () => {
    mockUseAuth.mockReturnValue({ firebaseUser: verifiedUser, loading: false });
    renderLayout();
    expect(screen.getByRole('button', { name: /feedback/i })).toBeInTheDocument();
  });
});
