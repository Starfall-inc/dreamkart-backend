module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'], // Include a new top-level 'tests' directory
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1', // Optional: if you want to use @src path alias
  },
  setupFilesAfterEnv: ['./jest.setup.js'], // Optional: for global test setup
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
};
