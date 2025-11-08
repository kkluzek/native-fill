import { beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";

const rootDir = path.resolve(__dirname, "..", "..");
const packageJson = JSON.parse(readFileSync(path.join(rootDir, "package.json"), "utf-8"));

const TARGETS = {
  safari: { command: "bun run build:safari", output: "safari-mv2" },
  chrome: { command: "bun run build:chrome", output: "chrome-mv3" },
  edge: { command: "bun run build:edge", output: "edge-mv3" }
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
    expect(safariManifest.permissions).toEqual(
      expect.arrayContaining(["storage", "contextMenus", "activeTab", "scripting"])
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
  });

  it("Edge MV3 manifest preserves permissions and icons", () => {
    expect(edgeManifest.permissions).toEqual(
      expect.arrayContaining(["storage", "contextMenus", "activeTab", "scripting"])
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
