
/**
 * Super Admin Configuration
 * These emails bypass the .edu requirement and always have admin access
 */
export const SUPER_ADMIN_EMAILS = [
  'calvinssendawula@gmail.com',
];

/**
 * Test/Dummy Student Accounts
 * These emails bypass the .edu requirement but get student access
 */
export const TEST_STUDENT_EMAILS = [
  'collegecareerstudent@gmail.com',
];

/**
 * Check if an email is a super admin
 */
export function isSuperAdmin(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Check if an email should bypass .edu validation
 */
export function bypassEduValidation(email: string): boolean {
  return isSuperAdmin(email) || TEST_STUDENT_EMAILS.includes(email.toLowerCase());
}