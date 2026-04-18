/**
 * @jest-environment jsdom
 *
 * SignUpForm — the other half of the auth entry point.
 * Focus: validation gates, correct signUp call, and the success screen.
 *
 * @/types/index.ts imports `db` from @/services/firebase/config which
 * transitively pulls in firebase/auth (requiring `fetch`).  We mock the
 * whole firebase/config module to keep tests self-contained.
 */

const mockSignUp = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signUp: mockSignUp }),
}));

jest.mock('@/config/superAdmin', () => ({
  bypassEduValidation: jest.fn().mockReturnValue(false),
}));

jest.mock('@/hooks/useSubChannels', () => ({
  useSubChannels: jest.fn().mockReturnValue({
    subChannels: [],
    loading: false,
    hasSubChannels: false,
  }),
}));

// Prevent firebase/auth from loading its Node.js adapter (which needs `fetch`)
jest.mock('@/services/firebase/config', () => ({
  auth: {},
  db: {},
  storage: {},
}));

jest.mock('firebase/auth', () => ({}));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  Timestamp: {},
  FieldValue: {},
}));
jest.mock('firebase/storage', () => ({}));
jest.mock('firebase/analytics', () => ({}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }),
}));

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignUpForm } from '@/components/auth/SignUpForm';
import toast from 'react-hot-toast';

const mockToastError = toast.error as jest.Mock;

// ── helpers ──────────────────────────────────────────────────────────────────

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/display name/i), 'Alice Smith');
  await user.type(screen.getByLabelText(/email address/i), 'alice@adams.edu');
  await user.type(screen.getByLabelText(/university/i), 'Adams State');
  await user.selectOptions(screen.getByLabelText(/^major$/i), 'Computer Science');
  await user.type(screen.getByLabelText(/^password$/i), 'Password1!');
  await user.type(screen.getByLabelText(/confirm password/i), 'Password1!');
}

function setup() {
  const user = userEvent.setup();
  render(<SignUpForm />);
  return { user };
}

// ── tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockSignUp.mockResolvedValue(undefined);
});

describe('SignUpForm — rendering', () => {
  it('renders all required fields', () => {
    setup();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/university/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^major$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('renders a "Create Account" submit button', () => {
    setup();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });
});

describe('SignUpForm — validation', () => {
  it('shows an error for a non-.edu email', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/display name/i), 'Alice');
    await user.type(screen.getByLabelText(/email address/i), 'alice@gmail.com');
    await user.type(screen.getByLabelText(/university/i), 'Adams State');
    await user.selectOptions(screen.getByLabelText(/^major$/i), 'Computer Science');
    await user.type(screen.getByLabelText(/^password$/i), 'Password1!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password1!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(expect.stringMatching(/\.edu/i)),
    );
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows an error when password is fewer than 8 characters', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/display name/i), 'Alice');
    await user.type(screen.getByLabelText(/email address/i), 'alice@adams.edu');
    await user.type(screen.getByLabelText(/university/i), 'Adams State');
    await user.selectOptions(screen.getByLabelText(/^major$/i), 'Computer Science');
    await user.type(screen.getByLabelText(/^password$/i), 'short');
    await user.type(screen.getByLabelText(/confirm password/i), 'short');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(expect.stringMatching(/8 characters/i)),
    );
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows an error when passwords do not match', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/display name/i), 'Alice');
    await user.type(screen.getByLabelText(/email address/i), 'alice@adams.edu');
    await user.type(screen.getByLabelText(/university/i), 'Adams State');
    await user.selectOptions(screen.getByLabelText(/^major$/i), 'Computer Science');
    await user.type(screen.getByLabelText(/^password$/i), 'Password1!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Different1\!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(expect.stringMatching(/do not match/i)),
    );
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows an error when display name is missing', async () => {
    // Use fireEvent.submit to bypass jsdom native `required` validation so our
    // custom validateForm() handler actually runs.
    const { container } = render(<SignUpForm />);
    // Fill every field except displayName
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'alice@adams.edu' } });
    fireEvent.change(screen.getByLabelText(/university/i), { target: { value: 'Adams State' } });
    fireEvent.change(screen.getByLabelText(/^major$/i), { target: { value: 'Computer Science' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password1!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password1!' } });
    // displayName stays blank
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(expect.stringMatching(/display name/i)),
    );
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows an error when no major is selected', async () => {
    // Use fireEvent.submit to bypass jsdom native `required` validation on the major <select>
    const { container } = render(<SignUpForm />);
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'alice@adams.edu' } });
    fireEvent.change(screen.getByLabelText(/university/i), { target: { value: 'Adams State' } });
    // leave major blank
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password1!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password1!' } });
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(expect.stringMatching(/major/i)),
    );
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('excludes the primary major from the second major options', async () => {
    // The component uses availableSecondMajors = SUPPORTED_MAJORS.filter(m => m !== formData.major)
    // so selecting Computer Science as primary should remove it from the second major dropdown.
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText(/^major$/i), 'Computer Science');

    const secondMajorSelect = screen.getByLabelText(/second major/i);
    const options = Array.from((secondMajorSelect as HTMLSelectElement).options).map(o => o.value);
    expect(options).not.toContain('Computer Science');
    // Other majors remain available
    expect(options.length).toBeGreaterThan(1);
  });
});

describe('SignUpForm — successful submission', () => {
  it('calls signUp with the correct arguments', async () => {
    const { user } = setup();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));
    const [email, password, displayName, university, major] = mockSignUp.mock.calls[0];
    expect(email).toBe('alice@adams.edu');
    expect(password).toBe('Password1!');
    expect(displayName).toBe('Alice Smith');
    expect(university).toBe('Adams State');
    expect(major).toBe('Computer Science');
  });

  it('shows the email-verification success screen after sign-up', async () => {
    const { user } = setup();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText(/check your email/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/alice@adams\.edu/)).toBeInTheDocument();
  });

  it('shows a toast error when signUp rejects', async () => {
    mockSignUp.mockRejectedValueOnce(new Error('Email already in use'));
    const { user } = setup();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('Email already in use'),
    );
  });
});

describe('SignUpForm — loading state', () => {
  it('disables the submit button while signUp is pending', async () => {
    mockSignUp.mockImplementation(() => new Promise(() => {}));
    const { user } = setup();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled(),
    );
  });
});

describe('SignUpForm — toggle mode', () => {
  it('calls onToggleMode when "Sign in" link is clicked', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    render(<SignUpForm onToggleMode={onToggle} />);
    await user.click(screen.getByText(/sign in/i));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
