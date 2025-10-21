
/**
 * Super Admin Configuration
 * These emails bypass the .edu requirement and always have admin access
 */
export const SUPER_ADMIN_EMAILS = [
  'calvinssendawula@gmail.com'
  // Add more super admin emails here if needed
] as const;

/**
 * Check if an email is a super admin
 */
export function isSuperAdmin(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase() as any);
}

/**
 * Check if an email should bypass .edu validation
 */
export function bypassEduValidation(email: string): boolean {
  return isSuperAdmin(email);
}