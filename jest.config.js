
module.exports = {
  transform: {
    '^.+\\.(t|j)s$': ['@swc/jest'],
  },
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
};