import { defineConfig } from "wxt";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DESCRIPTION = "NativeFill — privacy-first, native-like autofill with WASM fuzzy suggestions.";
const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  srcDir: "src",
  vite: () => ({
    resolve: {
      alias: {
        "@utils": path.resolve(rootDir, "src/utils"),
        "@types": path.resolve(rootDir, "src/types"),
        "@lib": path.resolve(rootDir, "src/lib"),
        "@styles": path.resolve(rootDir, "src/styles"),
        "@wasm": path.resolve(rootDir, "src/wasm")
      }
    }
  }),
  manifest: () => ({
    name: "NativeFill",
    description: DESCRIPTION,
    version: "2.1.0",
    host_permissions: ["<all_urls>"],
    permissions: ["storage", "contextMenus", "activeTab", "scripting"],
    action: {
      default_icon: {
        16: "assets/nativefill-mono.svg",
        32: "assets/nativefill-mono.svg"
      },
      default_title: "NativeFill",
      default_popup: "popup/index.html"
    },
    icons: {
      32: "assets/nativefill-mark.svg",
      64: "assets/nativefill-rocket.svg",
      128: "assets/nativefill-rocket.svg"
    },
    options_ui: {
      page: "options/index.html",
      open_in_tab: true
    },
    background: {
      service_worker: "background/index.js",
      type: "module"
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["content/index.js"],
        run_at: "document_idle"
      }
    ],
    web_accessible_resources: [
      {
        resources: ["wasm/*.wasm", "styles/*", "assets/*"],
        matches: ["<all_urls>"]
      }
    ]
  }),
  safari: {
    bundleIdentifier: "com.nativefill.extension",
    displayName: "NativeFill"
  }
});
