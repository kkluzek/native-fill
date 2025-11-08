import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const srcRoot = path.resolve(__dirname, "..", "..", "src");

const collectTsFiles = (cwd: string): string[] => {
  const entries = readdirSync(cwd, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const absolute = path.join(cwd, entry.name);
    if (entry.isDirectory()) {
      return collectTsFiles(absolute);
    }
    if (entry.isFile() && /\.(ts|tsx|js)$/.test(entry.name)) {
      return [absolute];
    }
    return [];
  });
};

describe("ACCEPTANCE C — storage.local as the single source of truth", () => {
  it("source code never references browser.storage.sync", () => {
    const files = collectTsFiles(srcRoot);
    const offenders = files.filter((file) => {
      try {
        const content = readFileSync(file, "utf-8");
        return content.includes("storage.sync");
      } catch {
        return false;
      }
    });
    expect(offenders).toEqual([]);
  });
});
