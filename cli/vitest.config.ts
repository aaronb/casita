import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    restoreMocks: true,
    exclude: ["**/*.integration.test.*", "**/node_modules/**", "**/dist/**"],
  },
});
