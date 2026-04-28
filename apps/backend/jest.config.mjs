/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true }]
  },
  moduleNameMapper: {
    "^franc$": "<rootDir>/tests/mocks/franc.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  roots: ["<rootDir>/tests"],
  collectCoverageFrom: ["src/**/*.ts", "!src/app.ts"],
  setupFiles: ["<rootDir>/tests/setup.js"]
};
