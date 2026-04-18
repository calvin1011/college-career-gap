/**
 * @jest-environment jsdom
 *
 * LoginForm — critical auth entry point.
 * We test the things that break silently: validation, signIn call, navigation,
 * loading state, and the reset-password flow.
 */

const mockPush = jest.fn();
const mockSignIn = jest.fn();
const mockResetPassword = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signIn: mockSignIn, resetPassword: mockResetPassword }),
}));

// By default, non-.edu email is not bypassed
jest.mock('@/config/superAdmin', () => ({
  bypassEduValidation: jest.fn().mockReturnValue(false),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/LoginForm';
import toast from 'react-hot-toast';

const mockToastError = toast.error as jest.Mock;

// ── helpers ──────────────────────────────────────────────────────────────────

function setup() {
  const user = userEvent.setup();
  render(<LoginForm />);
  return {
    user,
    emailInput: () => screen.getByTestId('email-input'),
    passwordInput: () => screen.getByTestId('password-input'),
    submitBtn: () => screen.getByTestId('signin-submit'),
  };
}

// ── tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockSignIn.mockResolvedValue(null); // default: no redirect path
});

describe('LoginForm — rendering', () => {
  it('renders email input, password input, and submit button', () => {
    const { emailInput, passwordInput, submitBtn } = setup();
    expect(emailInput()).toBeInTheDocument();
    expect(passwordInput()).toBeInTheDocument();
    expect(submitBtn()).toBeInTheDocument();
  });

  it('renders a "Forgot your password?" link', () => {
    setup();
    expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
  });
});

describe('LoginForm — client-side validation', () => {
  it('shows an error and does NOT call signIn when email is empty', () => {
    // Use fireEvent.submit to bypass jsdom native required-field validation
    // so our custom validateEmail() handler actually runs.
    const { container } = render(<LoginForm />);
    // Leave email blank, fill password
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
    fireEvent.submit(container.querySelector('form')!);

    expect(mockToastError).toHaveBeenCalledWith(expect.stringMatching(/email is required/i));
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('shows an error for a non-.edu email address', async () => {
    const { user, emailInput, passwordInput, submitBtn } = setup();
    await user.type(emailInput(), 'student@gmail.com');
    await user.type(passwordInput(), 'password123');
    await user.click(submitBtn());

    expect(mockToastError).toHaveBeenCalledWith(expect.stringMatching(/\.edu/i));
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('shows an error and does NOT call signIn when password is empty', () => {
    const { container } = render(<LoginForm />);
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'student@adams.edu' } });
    // Leave password blank
    fireEvent.submit(container.querySelector('form')!);

    expect(mockToastError).toHaveBeenCalledWith(expect.stringMatching(/password is required/i));
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('shows an error when password is fewer than 6 characters', async () => {
    const { user, emailInput, passwordInput, submitBtn } = setup();
    await user.type(emailInput(), 'student@adams.edu');
    await user.type(passwordInput(), 'abc');
    await user.click(submitBtn());

    expect(mockToastError).toHaveBeenCalledWith(expect.stringMatching(/6 characters/i));
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});

describe('LoginForm — successful sign-in', () => {
  it('calls signIn with the entered email and password', async () => {
    const { user, emailInput, passwordInput, submitBtn } = setup();
    await user.type(emailInput(), 'student@adams.edu');
    await user.type(passwordInput(), 'password123');
    await user.click(submitBtn());

    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith('student@adams.edu', 'password123'),
    );
  });

  it('navigates to /dashboard after successful sign-in (no custom redirect)', async () => {
    mockSignIn.mockResolvedValueOnce(null);
    const { user, emailInput, passwordInput, submitBtn } = setup();
    await user.type(emailInput(), 'student@adams.edu');
    await user.type(passwordInput(), 'password123');
    await user.click(submitBtn());

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'));
  });

  it('navigates to a custom path returned by signIn', async () => {
    mockSignIn.mockResolvedValueOnce('/dashboard/channels/computer-science');
    const { user, emailInput, passwordInput, submitBtn } = setup();
    await user.type(emailInput(), 'student@adams.edu');
    await user.type(passwordInput(), 'password123');
    await user.click(submitBtn());

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/dashboard/channels/computer-science'),
    );
  });

  it('shows a toast error when signIn rejects', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('Wrong password'));
    const { user, emailInput, passwordInput, submitBtn } = setup();
    await user.type(emailInput(), 'student@adams.edu');
    await user.type(passwordInput(), 'password123');
    await user.click(submitBtn());

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('Wrong password'),
    );
  });
});

describe('LoginForm — loading state', () => {
  it('disables the submit button while signing in', async () => {
    // signIn hangs so we can observe the loading state
    mockSignIn.mockImplementation(() => new Promise(() => {}));
    const { user, emailInput, passwordInput, submitBtn } = setup();
    await user.type(emailInput(), 'student@adams.edu');
    await user.type(passwordInput(), 'password123');
    await user.click(submitBtn());

    await waitFor(() => expect(submitBtn()).toBeDisabled());
  });
});

describe('LoginForm — toggle mode', () => {
  it('calls onToggleMode when the "Sign up" link is clicked', async () => {
    const onToggleMock = jest.fn();
    const user = userEvent.setup();
    render(<LoginForm onToggleMode={onToggleMock} />);

    await user.click(screen.getByTestId('toggle-signup'));
    expect(onToggleMock).toHaveBeenCalledTimes(1);
  });

  it('does not render the sign-up link when onToggleMode is not provided', () => {
    render(<LoginForm />);
    expect(screen.queryByTestId('toggle-signup')).not.toBeInTheDocument();
  });
});

describe('LoginForm — forgot password flow', () => {
  it('shows the reset-password form when "Forgot your password?" is clicked', async () => {
    const { user } = setup();
    await user.click(screen.getByText(/forgot your password/i));

    expect(screen.getByText(/reset password/i)).toBeInTheDocument();
    expect(screen.getByText(/send reset link/i)).toBeInTheDocument();
  });

  it('calls resetPassword with the entered email', async () => {
    mockResetPassword.mockResolvedValueOnce(undefined);
    const { user, emailInput } = setup();

    // Type email before switching to reset mode (email field is shared)
    await user.type(emailInput(), 'student@adams.edu');
    await user.click(screen.getByText(/forgot your password/i));
    await user.click(screen.getByText(/send reset link/i));

    await waitFor(() =>
      expect(mockResetPassword).toHaveBeenCalledWith('student@adams.edu'),
    );
  });

  it('returns to sign-in form when "Back to Sign In" is clicked', async () => {
    const { user } = setup();
    await user.click(screen.getByText(/forgot your password/i));
    await user.click(screen.getByText(/back to sign in/i));

    expect(screen.getByTestId('signin-submit')).toBeInTheDocument();
  });
});
