import { defineConfig } from "vite";
import path from "node:path";

const resolveFromRoot = (p: string) => path.resolve(__dirname, p);

export default defineConfig({
  root: "tests/harness",
  base: "./",
  server: {
    port: 4173,
    host: "0.0.0.0"
  },
  build: {
    outDir: resolveFromRoot("dist/harness"),
    emptyOutDir: true
  },
  resolve: {
    alias: {
      "@utils": resolveFromRoot("src/utils"),
      "@types": resolveFromRoot("src/types"),
      "@styles": resolveFromRoot("src/styles"),
      "@lib": resolveFromRoot("src/lib"),
      "@wasm": resolveFromRoot("src/wasm"),
      "wxt/utils/define-content-script": resolveFromRoot("tests/harness/shims/define-content-script.ts"),
      "webextension-polyfill": resolveFromRoot("tests/harness/shims/webextension-polyfill.ts")
    }
  }
});
