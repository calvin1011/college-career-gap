/**
 * @jest-environment node
 *
 * superAdmin exports are evaluated at module-load time from process.env.
 * We use jest.resetModules() + require() to re-evaluate with different env vars.
 */

type SuperAdminModule = {
  SUPER_ADMIN_EMAILS: string[];
  TEST_STUDENT_EMAILS: string[];
  isSuperAdmin: (email: string) => boolean;
  bypassEduValidation: (email: string) => boolean;
};

function loadModule(): SuperAdminModule {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/config/superAdmin') as SuperAdminModule;
}

afterAll(() => {
  // Restore clean state after all tests in this file
  delete process.env.SUPER_ADMIN_EMAILS;
  delete process.env.TEST_STUDENT_EMAILS;
  jest.resetModules();
});

// ── no env vars set ──────────────────────────────────────────────────────────
describe('superAdmin — no env vars', () => {
  let mod: SuperAdminModule;

  beforeAll(() => {
    delete process.env.SUPER_ADMIN_EMAILS;
    delete process.env.TEST_STUDENT_EMAILS;
    mod = loadModule();
  });

  it('SUPER_ADMIN_EMAILS is an empty array', () => {
    expect(mod.SUPER_ADMIN_EMAILS).toEqual([]);
  });

  it('TEST_STUDENT_EMAILS is an empty array', () => {
    expect(mod.TEST_STUDENT_EMAILS).toEqual([]);
  });

  it('isSuperAdmin returns false for any email', () => {
    expect(mod.isSuperAdmin('anyone@example.com')).toBe(false);
  });

  it('bypassEduValidation returns false for any email', () => {
    expect(mod.bypassEduValidation('anyone@gmail.com')).toBe(false);
  });
});

// ── empty string env var ─────────────────────────────────────────────────────
describe('superAdmin — empty-string env var', () => {
  let mod: SuperAdminModule;

  beforeAll(() => {
    process.env.SUPER_ADMIN_EMAILS = '';
    process.env.TEST_STUDENT_EMAILS = '';
    mod = loadModule();
  });

  it('produces an empty array (filter(Boolean) removes empty strings)', () => {
    expect(mod.SUPER_ADMIN_EMAILS).toEqual([]);
    expect(mod.TEST_STUDENT_EMAILS).toEqual([]);
  });
});

// ── env vars populated ───────────────────────────────────────────────────────
describe('superAdmin — populated env vars', () => {
  let mod: SuperAdminModule;

  beforeAll(() => {
    process.env.SUPER_ADMIN_EMAILS = 'admin@example.com,BOSS@EXAMPLE.COM';
    process.env.TEST_STUDENT_EMAILS = 'test@student.com, dummy@test.org ';
    mod = loadModule();
  });

  // ── SUPER_ADMIN_EMAILS parsing ─────────────────────────────────────────
  it('parses comma-separated super-admin emails', () => {
    expect(mod.SUPER_ADMIN_EMAILS).toHaveLength(2);
    expect(mod.SUPER_ADMIN_EMAILS).toContain('admin@example.com');
  });

  it('normalises super-admin emails to lowercase', () => {
    expect(mod.SUPER_ADMIN_EMAILS).toContain('boss@example.com');
    expect(mod.SUPER_ADMIN_EMAILS).not.toContain('BOSS@EXAMPLE.COM');
  });

  // ── TEST_STUDENT_EMAILS parsing ────────────────────────────────────────
  it('parses comma-separated test-student emails', () => {
    expect(mod.TEST_STUDENT_EMAILS).toContain('test@student.com');
    expect(mod.TEST_STUDENT_EMAILS).toContain('dummy@test.org');
  });

  it('trims whitespace around test-student emails', () => {
    expect(mod.TEST_STUDENT_EMAILS).not.toContain(' dummy@test.org ');
    expect(mod.TEST_STUDENT_EMAILS).toContain('dummy@test.org');
  });

  // ── isSuperAdmin ───────────────────────────────────────────────────────
  it('isSuperAdmin returns true for a configured admin email', () => {
    expect(mod.isSuperAdmin('admin@example.com')).toBe(true);
  });

  it('isSuperAdmin is case-insensitive', () => {
    expect(mod.isSuperAdmin('ADMIN@EXAMPLE.COM')).toBe(true);
    expect(mod.isSuperAdmin('Admin@Example.Com')).toBe(true);
    expect(mod.isSuperAdmin('BOSS@EXAMPLE.COM')).toBe(true);
  });

  it('isSuperAdmin returns false for an email not in the list', () => {
    expect(mod.isSuperAdmin('notadmin@example.com')).toBe(false);
    expect(mod.isSuperAdmin('')).toBe(false);
  });

  // ── bypassEduValidation ────────────────────────────────────────────────
  it('bypassEduValidation returns true for a super admin', () => {
    expect(mod.bypassEduValidation('admin@example.com')).toBe(true);
  });

  it('bypassEduValidation returns true for a test student', () => {
    expect(mod.bypassEduValidation('test@student.com')).toBe(true);
  });

  it('bypassEduValidation returns false for a regular user', () => {
    expect(mod.bypassEduValidation('regular@gmail.com')).toBe(false);
  });

  it('bypassEduValidation is case-insensitive for super admins', () => {
    expect(mod.bypassEduValidation('ADMIN@EXAMPLE.COM')).toBe(true);
  });

  it('bypassEduValidation is case-insensitive for test students', () => {
    expect(mod.bypassEduValidation('TEST@STUDENT.COM')).toBe(true);
  });
});
