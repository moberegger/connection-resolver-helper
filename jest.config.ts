import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  clearMocks: true,
  preset: "ts-jest",
  setupFilesAfterEnv: ["jest-extended/all"],
  testEnvironment: "node",
};

export default config;
