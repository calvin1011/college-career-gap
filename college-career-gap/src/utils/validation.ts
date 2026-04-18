export const validateEducationalEmail = (email: string): boolean => {
  return email.toLowerCase().endsWith('.edu');
};

export const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
  return null;
};

/**
 * Strip all HTML tags from user-supplied message content.
 *
 * Regex-based allow-lists are brittle (e.g. nested tags, HTML entities,
 * mutation XSS). This implementation takes the opposite approach: it strips
 * every HTML tag unconditionally so that only plain text reaches Firestore
 * and the renderer. If rich formatting is needed in the future, adopt a
 * server-side allow-list parser (e.g. sanitize-html with a strict config).
 */
export const sanitizeMessageContent = (content: string): string => {
  if (typeof content !== 'string') {
    throw new Error('Message content must be a string');
  }
  if (content.length > 2000) {
    throw new Error('Message exceeds maximum length of 2000 characters');
  }

  // 1. Replace HTML entities that could encode angle brackets
  let sanitized = content
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x3[cC];/gi, '<')
    .replace(/&#x3[eE];/gi, '>')
    .replace(/&#60;/gi, '<')
    .replace(/&#62;/gi, '>');

  // 2. Strip every HTML/XML tag
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // 3. Re-encode any remaining angle brackets so the output is always safe
  //    plain text regardless of how the caller renders it
  sanitized = sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return sanitized.trim();
};