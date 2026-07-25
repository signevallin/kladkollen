/** Enhetstester för rena hjälpfunktioner (node-miljö, ts-jest).
 *  Kör med: npm test
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  // Rena logiktester – transformera bara TS, strunta i typcheck-fel som inte
  // rör testerna (snabbare och tåligare mot projektets expo-tsconfig).
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
  },
}
