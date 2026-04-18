const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Force firebase-admin subpath imports to always resolve from the project-root
    // node_modules.  Without this, requires from src/functions/index.js find the
    // local src/functions/node_modules copy (different absolute path → different
    // module-registry key → jest.mock() doesn't intercept them).
    '^firebase-admin/app$': '<rootDir>/node_modules/firebase-admin/lib/app/index.js',
    '^firebase-admin/firestore$': '<rootDir>/node_modules/firebase-admin/lib/firestore/index.js',
    '^firebase-admin/messaging$': '<rootDir>/node_modules/firebase-admin/lib/messaging/index.js',
  },
  // Custom resolver: forces firebase-admin / firebase-functions imports to
  // always resolve from the project-root node_modules so jest.mock()
  // registrations (which use the root-resolved path) actually intercept
  // require() calls from inside src/functions/index.js.
  resolver: '<rootDir>/jest-resolver.js',
  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.ts',
    '<rootDir>/src/__tests__/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    'src/lib/**/*.ts',
    'src/config/**/*.ts',
    'src/app/api/**/*.ts',
    'src/contexts/**/*.tsx',
  ],
};

module.exports = createJestConfig(customConfig);
