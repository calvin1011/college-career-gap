/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

// ── Firebase auth mocks ──────────────────────────────────────────────────────
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendEmailVerification: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  deleteUser: jest.fn(),
}));

// ── Firestore mocks ──────────────────────────────────────────────────────────
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(),
  runTransaction: jest.fn(),
  arrayUnion: jest.fn((...items: unknown[]) => items),
  increment: jest.fn((n: number) => n),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  Transaction: jest.fn(),
}));

// ── Firebase config ──────────────────────────────────────────────────────────
jest.mock('@/services/firebase/config', () => ({ auth: {}, db: {} }));

// ── ChannelService mocks ─────────────────────────────────────────────────────
jest.mock('@/components/channels/ChannelService', () => ({
  findChannelByMajor: jest.fn(),
  deleteUserAccount: jest.fn(),
  findChannelByInviteCode: jest.fn(),
  joinChannel: jest.fn(),
}));

// ── superAdmin mocks ─────────────────────────────────────────────────────────
jest.mock('@/config/superAdmin', () => ({
  isSuperAdmin: jest.fn().mockReturnValue(false),
  bypassEduValidation: jest.fn().mockReturnValue(false),
}));

// ── react-hot-toast mock ─────────────────────────────────────────────────────
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

// ── import after mocks are registered ───────────────────────────────────────
import * as firebaseAuth from 'firebase/auth';
import * as firebaseFirestore from 'firebase/firestore';
import * as superAdmin from '@/config/superAdmin';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Typed references
const mockOnAuthStateChanged = firebaseAuth.onAuthStateChanged as jest.Mock;
const mockSignInWithEmailAndPassword = firebaseAuth.signInWithEmailAndPassword as jest.Mock;
const mockSignOut = firebaseAuth.signOut as jest.Mock;
const mockSendPasswordResetEmail = firebaseAuth.sendPasswordResetEmail as jest.Mock;
const mockOnSnapshot = firebaseFirestore.onSnapshot as jest.Mock;
const mockDoc = firebaseFirestore.doc as jest.Mock;
const mockIsSuperAdmin = superAdmin.isSuperAdmin as jest.Mock;

// ── test helpers ─────────────────────────────────────────────────────────────

type FakeFirebaseUser = { uid: string; email: string; emailVerified: boolean };

/** Simulate auth state: no logged-in user. */
function simulateSignedOut() {
  mockOnAuthStateChanged.mockImplementation(
    (_auth: unknown, callback: (u: null) => void) => {
      callback(null);
      return jest.fn(); // unsubscribe
    },
  );
}

/** Simulate auth state: logged-in user with a Firestore profile. */
function simulateSignedIn(
  fbUser: FakeFirebaseUser = {
    uid: 'user-123',
    email: 'student@adams.edu',
    emailVerified: true,
  },
  firestoreData: Record<string, unknown> = {
    email: 'student@adams.edu',
    role: 'student',
    displayName: 'Alice',
  },
) {
  mockOnAuthStateChanged.mockImplementation(
    (_auth: unknown, callback: (u: FakeFirebaseUser) => void) => {
      callback(fbUser);
      return jest.fn();
    },
  );
  mockDoc.mockReturnValue('user-doc-ref');
  mockOnSnapshot.mockImplementation(
    (_ref: unknown, callback: (snap: object) => void) => {
      callback({
        exists: () => true,
        id: fbUser.uid,
        data: () => firestoreData,
      });
      return jest.fn();
    },
  );
}

/** Wrapper for renderHook to include the provider. */
function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

// ── tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockIsSuperAdmin.mockReturnValue(false);
});

// ── useAuth hook ─────────────────────────────────────────────────────────────
describe('useAuth', () => {
  it('throws a descriptive error when used outside AuthProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/i);
    spy.mockRestore();
  });
});

// ── unauthenticated state ────────────────────────────────────────────────────
describe('AuthProvider — unauthenticated', () => {
  it('renders children without crashing', async () => {
    simulateSignedOut();
    await act(async () => {
      render(
        <AuthProvider>
          <span data-testid="child">hello</span>
        </AuthProvider>,
      );
    });
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('loading becomes false after auth resolves to null', async () => {
    simulateSignedOut();
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('user is null when signed out', async () => {
    simulateSignedOut();
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('firebaseUser is null when signed out', async () => {
    simulateSignedOut();
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.firebaseUser).toBeNull();
  });
});

// ── authenticated state ──────────────────────────────────────────────────────
describe('AuthProvider — authenticated', () => {
  it('loading becomes false after user data loads', async () => {
    simulateSignedIn();
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('exposes the Firebase user object', async () => {
    simulateSignedIn({ uid: 'user-123', email: 'student@adams.edu', emailVerified: true });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.firebaseUser).not.toBeNull());
    expect(result.current.firebaseUser?.uid).toBe('user-123');
  });

  it('exposes the merged Firestore user profile', async () => {
    simulateSignedIn(
      { uid: 'user-123', email: 'student@adams.edu', emailVerified: true },
      { email: 'student@adams.edu', role: 'student', displayName: 'Alice' },
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());
    expect(result.current.user?.displayName).toBe('Alice');
    expect(result.current.user?.role).toBe('student');
    expect(result.current.user?.uid).toBe('user-123');
  });

  it('sets user to null when Firestore snapshot shows no document', async () => {
    const fbUser = { uid: 'user-456', email: 'x@adams.edu', emailVerified: true };
    mockOnAuthStateChanged.mockImplementation(
      (_a: unknown, cb: (u: typeof fbUser) => void) => { cb(fbUser); return jest.fn(); },
    );
    mockDoc.mockReturnValue('ref');
    mockOnSnapshot.mockImplementation(
      (_ref: unknown, cb: (s: object) => void) => {
        cb({ exists: () => false, id: fbUser.uid, data: () => null });
        return jest.fn();
      },
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });
});

// ── signIn ───────────────────────────────────────────────────────────────────
describe('AuthProvider — signIn', () => {
  it('calls signInWithEmailAndPassword with the right credentials', async () => {
    simulateSignedOut();
    mockSignInWithEmailAndPassword.mockResolvedValueOnce({
      user: { uid: 'u1', email: 'admin@test.com', emailVerified: true },
    });
    mockIsSuperAdmin.mockReturnValue(true); // skip verification check

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signIn('admin@test.com', 'Password1');
    });

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'admin@test.com',
      'Password1',
    );
  });

  it('throws when the email is not verified (non-super-admin)', async () => {
    simulateSignedOut();
    mockSignInWithEmailAndPassword.mockResolvedValueOnce({
      user: { uid: 'u2', email: 'student@adams.edu', emailVerified: false },
    });
    mockSignOut.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => { await result.current.signIn('student@adams.edu', 'Password1'); }),
    ).rejects.toThrow(/verify your email/i);

    expect(mockSignOut).toHaveBeenCalled();
  });
});

// ── signOut ──────────────────────────────────────────────────────────────────
describe('AuthProvider — signOut', () => {
  it('calls Firebase signOut', async () => {
    simulateSignedIn();
    mockSignOut.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.signOut(); });
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('sets user and firebaseUser to null after sign-out', async () => {
    simulateSignedIn();
    mockSignOut.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.signOut(); });
    expect(result.current.user).toBeNull();
    expect(result.current.firebaseUser).toBeNull();
  });
});

// ── resetPassword ────────────────────────────────────────────────────────────
describe('AuthProvider — resetPassword', () => {
  it('calls sendPasswordResetEmail with the provided address', async () => {
    simulateSignedOut();
    mockSendPasswordResetEmail.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.resetPassword('student@adams.edu'); });
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      expect.anything(),
      'student@adams.edu',
    );
  });
});

// ── context shape ─────────────────────────────────────────────────────────────
describe('AuthProvider — context API shape', () => {
  it('exposes all required methods and state properties', async () => {
    simulateSignedOut();
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signUp).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
    expect(typeof result.current.resetPassword).toBe('function');
    expect(typeof result.current.handleDeleteAccount).toBe('function');
    expect('user' in result.current).toBe(true);
    expect('firebaseUser' in result.current).toBe(true);
    expect('loading' in result.current).toBe(true);
  });
});
