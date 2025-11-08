import { describe, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..");
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".output",
  "artifacts",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results"
]);

const isDirectory = (entryPath: string) => {
  try {
    return statSync(entryPath).isDirectory();
  } catch {
    return false;
  }
};

const collectMarkdownFiles = (cwd: string, relativePrefix = "."): string[] => {
  const entries = readdirSync(cwd);
  return entries.flatMap((entry) => {
    const absoluteEntry = path.join(cwd, entry);
    const relativeEntry = path.join(relativePrefix, entry);
    if (IGNORED_DIRECTORIES.has(entry)) {
      return [];
    }
    if (isDirectory(absoluteEntry)) {
      return collectMarkdownFiles(absoluteEntry, relativeEntry);
    }
    if (entry.toLowerCase().endsWith(".md")) {
      return [relativeEntry.replace(/^\.\//, "")];
    }
    return [];
  });
};

const truncate = (value: string, max = 140) => {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
};

const extractPoints = (content: string) => {
  const lines = content.split(/\r?\n/);
  const points: { line: number; text: string }[] = [];
  let insideFence = false;
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      insideFence = !insideFence;
      return;
    }
    if (insideFence || trimmed.length === 0) {
      return;
    }
    points.push({ line: index + 1, text: trimmed });
  });
  return points;
};

const markdownFiles = collectMarkdownFiles(repoRoot).sort();

describe("Documentation Scaffolding", () => {
  markdownFiles.forEach((relativePath) => {
    const absolutePath = path.join(repoRoot, relativePath);
    const content = readFileSync(absolutePath, "utf-8");
    const points = extractPoints(content);
    describe(relativePath, () => {
      if (!points.length) {
        it.todo(`[${relativePath}] brak treści do odwzorowania`);
        return;
      }
      points.forEach((point) => {
        const label = `[${relativePath}:L${point.line}] ${truncate(point.text)}`;
        it.todo(label);
      });
    });
  });
});
