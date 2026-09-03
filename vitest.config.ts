import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/tests/**/*.test.ts", "server/**/*.test.ts"],
    env: {
      JWT_SECRET: "test-secret-for-unit-tests-only",
      // Dummy value: satisfies the module-scope `requireEnv("DATABASE_URL")` check
      // in server/db/index.ts when a test file imports a service module. The Pool
      // is created lazily and unit tests never issue a real query through it.
      DATABASE_URL: "postgresql://user:pass@localhost:5432/unused_in_unit_tests",
    },
  },
});
