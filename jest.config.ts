import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  clearMocks: true,
  preset: "ts-jest",
  setupFilesAfterEnv: ["jest-extended/all"],
  testEnvironment: "node",
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        diagnostics: {
          warnOnly: true,
        },
      },
    ],
  },
};

export default config;
