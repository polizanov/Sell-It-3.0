/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  // MongoMemoryServer may download MongoDB binaries on first run.
  testTimeout: 60000,
  clearMocks: true,
  verbose: true
};

