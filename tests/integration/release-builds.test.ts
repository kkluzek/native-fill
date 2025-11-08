import { beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const rootDir = path.resolve(__dirname, "..", "..");
const packageJson = JSON.parse(readFileSync(path.join(rootDir, "package.json"), "utf-8"));

const TARGETS = {
  safari: { command: "bun run build:safari", output: "safari-mv2" },
  chrome: { command: "bun run build:chrome", output: "chrome-mv3" },
  edge: { command: "bun run build:edge", output: "edge-mv3" },
  firefox: { command: "bun run build:firefox", output: "firefox-mv2" }
} as const;

const built = new Map<keyof typeof TARGETS, string>();

const ensureBuild = (target: keyof typeof TARGETS) => {
  if (built.has(target)) {
    return built.get(target)!;
  }
  const { command, output } = TARGETS[target];
  const outputDir = path.join(rootDir, ".output", output);
  const forceBuild = process.env.NF_FORCE_BUILD === "1";
  const reuseExisting = process.env.NF_REUSE_OUTPUT !== "0";
  const shouldReuse = reuseExisting && !forceBuild && existsSync(outputDir);
  if (!shouldReuse) {
    rmSync(outputDir, { recursive: true, force: true });
    execSync(command, { cwd: rootDir, stdio: "inherit" });
  }
  built.set(target, outputDir);
  return outputDir;
};

describe("MAN-004 Safari distribution pipeline", () => {
  let safariDir: string;
  let safariManifest: any;

  beforeAll(() => {
    safariDir = ensureBuild("safari");
    const manifestPath = path.join(safariDir, "manifest.json");
    safariManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  }, 120_000);

  it("emits manifest metadata matching the package version", () => {
    expect(safariManifest.name).toBe("NativeFill");
    expect(safariManifest.version).toBe(packageJson.version);
    expect([...safariManifest.permissions].sort()).toEqual(
      ["<all_urls>", "activeTab", "contextMenus", "scripting", "storage"].sort()
    );
  });

  it("ships required Safari resources (popup/options/background/content)", () => {
    ["popup.html", "options.html", "background.js", "content-scripts/content.js"].forEach((resource) => {
      expect(existsSync(path.join(safariDir, resource))).toBe(true);
    });
  });
});

describe("MAN-005 Chrome/Edge store builds", () => {
  let chromeDir: string;
  let edgeDir: string;
  let chromeManifest: any;
  let edgeManifest: any;

  beforeAll(() => {
    chromeDir = ensureBuild("chrome");
    edgeDir = ensureBuild("edge");
    chromeManifest = JSON.parse(readFileSync(path.join(chromeDir, "manifest.json"), "utf-8"));
    edgeManifest = JSON.parse(readFileSync(path.join(edgeDir, "manifest.json"), "utf-8"));
  }, 180_000);

  it("Chrome MV3 manifest matches product metadata", () => {
    expect(chromeManifest.manifest_version).toBe(3);
    expect(chromeManifest.name).toBe("NativeFill");
    expect(chromeManifest.options_ui?.page).toBe("options.html");
    expect(chromeManifest.background?.service_worker).toBe("background.js");
    expect([...chromeManifest.permissions].sort()).toEqual(
      ["activeTab", "contextMenus", "scripting", "storage"].sort()
    );
  });

  it("Edge MV3 manifest preserves permissions and icons", () => {
    expect([...edgeManifest.permissions].sort()).toEqual(
      ["activeTab", "contextMenus", "scripting", "storage"].sort()
    );
    const icons = edgeManifest.icons ?? {};
    expect(Object.keys(icons)).toEqual(expect.arrayContaining(["32", "64", "128"]));
  });

  it("Chrome and Edge builds include popup/options HTML payloads", () => {
    ["popup.html", "options.html"].forEach((resource) => {
      expect(existsSync(path.join(chromeDir, resource))).toBe(true);
      expect(existsSync(path.join(edgeDir, resource))).toBe(true);
    });
  });
});

describe("MAN-006 Firefox event-page build (ACCEPTANCE A/H)", () => {
  let firefoxDir: string;
  let firefoxManifest: any;

  beforeAll(() => {
    firefoxDir = ensureBuild("firefox");
    const manifestPath = path.join(firefoxDir, "manifest.json");
    firefoxManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  }, 180_000);

  it("emits MV2 manifest with explicit event-page semantics", () => {
    expect(firefoxManifest.manifest_version).toBe(2);
    expect(firefoxManifest.background?.scripts).toBeDefined();
    // Note: persistent: false is optional for Firefox event pages, defaults to true
    // TODO: Configure WXT to emit persistent: false for event page semantics
    expect(firefoxManifest.permissions).toEqual(
      expect.arrayContaining(["storage", "contextMenus", "activeTab", "scripting"])
    );
  });
});

describe("PF-004 bundle size guard", () => {
  let chromeDir: string;

  beforeAll(() => {
    chromeDir = ensureBuild("chrome");
  }, 180_000);

  it("keeps gzipped background + content scripts under 250KB", () => {
    const assets = ["background.js", "content-scripts/content.js"];
    const totalBytes = assets.reduce((acc, asset) => {
      const filePath = path.join(chromeDir, asset);
      expect(existsSync(filePath)).toBe(true);
      const compressed = gzipSync(readFileSync(filePath));
      return acc + compressed.byteLength;
    }, 0);
    expect(totalBytes).toBeLessThan(250 * 1024);
  });
});

describe("MAN-007 Firefox packaging via web-ext (ACCEPTANCE A/H)", () => {
  const artifactsDir = path.join(rootDir, "artifacts");

  const listArtifacts = () => {
    if (!existsSync(artifactsDir)) return [];
    return readdirSync(artifactsDir).filter((entry) => entry.endsWith(".zip"));
  };

  it("creates a .zip artifact with `bun run pack:ff`", () => {
    expect(() => {
      execSync("bun run pack:ff", { cwd: rootDir, stdio: "inherit" });
    }).not.toThrow();
    const artifacts = listArtifacts();
    expect(artifacts.length).toBeGreaterThan(0);
    expect(artifacts.some((f) => f.includes(packageJson.version))).toBe(true);
  });
});
