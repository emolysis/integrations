import { defineConfig } from "vitest/config";

// Repository-level tests: manifests, client configs and the config checker.
// The shim package runs its own tests (packages/mcp-shim).
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
