/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */

module.exports = {
  clearMocks: true,
  preset: 'ts-jest',
  "setupFilesAfterEnv": ["jest-extended/all"],
  testEnvironment: 'node',
};