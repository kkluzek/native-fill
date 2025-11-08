import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    coverage: {
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"]
    }
  },
  resolve: {
    alias: {
      "@utils": new URL("./src/utils", import.meta.url).pathname,
      "@types": new URL("./src/types", import.meta.url).pathname,
      "@styles": new URL("./src/styles", import.meta.url).pathname,
      "@lib": new URL("./src/lib", import.meta.url).pathname,
      "@wasm": new URL("./src/wasm", import.meta.url).pathname
    }
  }
});
