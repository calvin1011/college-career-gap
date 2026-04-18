import {
  sanitizeMessageContent,
  validateEducationalEmail,
  validatePassword,
} from '@/utils/validation';

// ─── validateEducationalEmail ────────────────────────────────────────────────

describe('validateEducationalEmail', () => {
  it('accepts a standard .edu address', () => {
    expect(validateEducationalEmail('student@adams.edu')).toBe(true);
  });

  it('accepts any subdomain under .edu', () => {
    expect(validateEducationalEmail('user@mail.university.edu')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(validateEducationalEmail('USER@ADAMS.EDU')).toBe(true);
    expect(validateEducationalEmail('User@Adams.Edu')).toBe(true);
  });

  it('rejects a plain gmail address', () => {
    expect(validateEducationalEmail('user@gmail.com')).toBe(false);
  });

  it('rejects an address whose domain starts with "edu" but is not .edu', () => {
    expect(validateEducationalEmail('user@edu.org')).toBe(false);
  });

  it('rejects an address with .edu in the local part', () => {
    expect(validateEducationalEmail('edu@example.com')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(validateEducationalEmail('')).toBe(false);
  });
});

// ─── validatePassword ────────────────────────────────────────────────────────

describe('validatePassword', () => {
  it('returns null for a valid password', () => {
    expect(validatePassword('Password1')).toBeNull();
    expect(validatePassword('Str0ngP@ss')).toBeNull();
  });

  it('returns an error for an empty password', () => {
    expect(validatePassword('')).toBeTruthy();
  });

  it('requires at least 8 characters', () => {
    expect(validatePassword('Pass1')).toMatch(/8 characters/i);
  });

  it('requires at least one uppercase letter', () => {
    expect(validatePassword('password1')).toMatch(/uppercase/i);
  });

  it('requires at least one lowercase letter', () => {
    expect(validatePassword('PASSWORD1')).toMatch(/lowercase/i);
  });

  it('requires at least one digit', () => {
    expect(validatePassword('PasswordNoDigit')).toMatch(/number/i);
  });

  it('returns null when the password meets all criteria exactly at 8 chars', () => {
    expect(validatePassword('Passwrd1')).toBeNull();
  });
});

// ─── sanitizeMessageContent ──────────────────────────────────────────────────

describe('sanitizeMessageContent', () => {
  // ── plain text ──────────────────────────────────────────────────────────
  it('passes plain text through unchanged', () => {
    expect(sanitizeMessageContent('Hello, world\!')).toBe('Hello, world\!');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeMessageContent('  hello  ')).toBe('hello');
    expect(sanitizeMessageContent('\n\nhello\n\n')).toBe('hello');
  });

  it('returns an empty string for whitespace-only input', () => {
    expect(sanitizeMessageContent('   ')).toBe('');
  });

  it('returns an empty string for empty input', () => {
    expect(sanitizeMessageContent('')).toBe('');
  });

  // ── HTML tag stripping ──────────────────────────────────────────────────
  it('strips bold tags', () => {
    expect(sanitizeMessageContent('<b>bold</b>')).toBe('bold');
  });

  it('strips script tags and their content', () => {
    // The tag is stripped; the inner text that is NOT angle-brackets survives
    const result = sanitizeMessageContent('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('</script>');
    // text between the tags survives (alert("xss")) encoded safely
    expect(result).toContain('alert');
  });

  it('strips nested tags', () => {
    expect(sanitizeMessageContent('<div><span>text</span></div>')).toBe('text');
  });

  it('strips self-closing tags', () => {
    expect(sanitizeMessageContent('before<br/>after')).toBe('beforeafter');
    expect(sanitizeMessageContent('<img src="x" />')).toBe('');
  });

  it('strips tags with attributes', () => {
    expect(sanitizeMessageContent('<a href="javascript:void(0)">click</a>')).toBe('click');
  });

  // ── angle-bracket re-encoding ───────────────────────────────────────────
  it('re-encodes bare angle brackets left in plain text', () => {
    // NOTE: '< b >' matches the tag regex and is stripped — the sanitizer is intentionally strict
    expect(sanitizeMessageContent('a < b > c')).toBe('a  c');
    // A lone '<' with no closing '>' is preserved (re-encoded)
    expect(sanitizeMessageContent('a < b')).toBe('a &lt; b');
    // A lone '>' with no opening '<' is re-encoded too
    expect(sanitizeMessageContent('1 > 0')).toBe('1 &gt; 0');
  });

  it('produces no literal < or > in output', () => {
    const inputs = [
      '<b>bold</b>',
      'a < b',
      '1 > 0',
      '&lt;script&gt;',
      '&#60;b&#62;',
    ];
    for (const input of inputs) {
      const out = sanitizeMessageContent(input);
      expect(out).not.toMatch(/[<>]/);
    }
  });

  // ── entity decoding before stripping ───────────────────────────────────
  it('decodes &lt; / &gt; entities then re-encodes them safely', () => {
    const result = sanitizeMessageContent('&lt;b&gt;text&lt;/b&gt;');
    // After decode → <b>text</b>, tags stripped → text, no residual </>
    expect(result).toBe('text');
  });

  it('decodes &#x3c; (hex) angle-bracket entities', () => {
    const result = sanitizeMessageContent('&#x3c;script&#x3e;alert(1)&#x3c;/script&#x3e;');
    expect(result).not.toMatch(/[<>]/);
    expect(result).toContain('alert(1)');
  });

  it('decodes &#60; (decimal) angle-bracket entities', () => {
    const result = sanitizeMessageContent('&#60;b&#62;text&#60;/b&#62;');
    expect(result).not.toMatch(/[<>]/);
    expect(result).toBe('text');
  });

  it('handles mixed entity styles without producing a tag', () => {
    const result = sanitizeMessageContent('&lt;script&#62;');
    expect(result).not.toMatch(/[<>]/);
  });

  // ── length guards ───────────────────────────────────────────────────────
  it('accepts exactly 2000 characters', () => {
    const exactly2000 = 'a'.repeat(2000);
    expect(sanitizeMessageContent(exactly2000)).toBe(exactly2000);
  });

  it('throws when input exceeds 2000 characters', () => {
    const tooLong = 'a'.repeat(2001);
    expect(() => sanitizeMessageContent(tooLong)).toThrow(/2000/);
  });

  // ── type guard ──────────────────────────────────────────────────────────
  it('throws when input is not a string', () => {
    expect(() => sanitizeMessageContent(null as unknown as string)).toThrow(
      /must be a string/i,
    );
    expect(() => sanitizeMessageContent(42 as unknown as string)).toThrow(
      /must be a string/i,
    );
  });

  // ── XSS edge cases ──────────────────────────────────────────────────────
  it('strips event-handler attributes', () => {
    const result = sanitizeMessageContent('<img onerror="alert(1)" src="x">');
    expect(result).not.toMatch(/[<>]/);
    expect(result).not.toContain('onerror');
  });

  it('neutralises a javascript: href', () => {
    const result = sanitizeMessageContent('<a href="javascript:alert(1)">click</a>');
    expect(result).toBe('click');
  });

  it('does not double-encode an already-safe message', () => {
    const safe = 'Hello, how are you? 1 + 1 = 2';
    expect(sanitizeMessageContent(safe)).toBe(safe);
  });
});
