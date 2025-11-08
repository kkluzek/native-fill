import { defineConfig } from "vite";
import path from "node:path";

const resolveFromRoot = (p: string) => path.resolve(__dirname, p);

const rootDir = "tests/harness";
export default defineConfig({
  root: rootDir,
  base: "./",
  server: {
    port: 4173,
    host: "0.0.0.0"
  },
  build: {
    outDir: resolveFromRoot("dist/harness"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolveFromRoot("tests/harness/index.html"),
        options: resolveFromRoot("tests/harness/options.html")
      }
    }
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
