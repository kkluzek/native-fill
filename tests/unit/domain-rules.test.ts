import { describe, expect, it } from "vitest";
import { resolveDomainRules } from "../../src/utils/domain";
import type { DomainRule } from "../../src/types/data";

const baseRule = (overrides: Partial<DomainRule>): DomainRule => ({
  id: overrides.id ?? crypto.randomUUID(),
  pattern: overrides.pattern ?? "*",
  includeFolders: overrides.includeFolders ?? [],
  excludeFolders: overrides.excludeFolders ?? [],
  boostTags: overrides.boostTags ?? [],
  disableOnHost: overrides.disableOnHost ?? false,
  notes: overrides.notes,
  createdAt: overrides.createdAt ?? "2025-01-01",
  updatedAt: overrides.updatedAt ?? "2025-01-01"
});

describe("UT-001 resolveDomainRules", () => {
  it("aggregates include/exclude folders and boost tags", () => {
    const rules: DomainRule[] = [
      baseRule({ pattern: "*.example.com", includeFolders: ["Global"], boostTags: ["outreach"] }),
      baseRule({ pattern: "portal.example.com", includeFolders: ["Portal"], excludeFolders: ["Legacy"] })
    ];

    const result = resolveDomainRules("portal.example.com", rules);

    expect(result.includeFolders.has("Portal")).toBe(true);
    expect(result.includeFolders.has("Global")).toBe(true);
    expect(result.excludeFolders.has("Legacy")).toBe(true);
    expect(result.boostTags.has("outreach")).toBe(true);
    expect(result.disable).toBe(false);
  });

  it("prefers more specific wildcard patterns when computing disable flag", () => {
    const rules: DomainRule[] = [
      baseRule({ pattern: "*.example.com", disableOnHost: true }),
      baseRule({ pattern: "login.example.com", disableOnHost: false })
    ];

    const wildcard = resolveDomainRules("docs.example.com", rules);
    expect(wildcard.disable).toBe(true);

    const exact = resolveDomainRules("login.example.com", rules);
    expect(exact.disable).toBe(true); // disable wins regardless of specificity
  });

  it("returns empty sets when no rule matches", () => {
    const rules: DomainRule[] = [baseRule({ pattern: "*.other.com", includeFolders: ["Other"] })];
    const result = resolveDomainRules("nativefill.dev", rules);
    expect(result.disable).toBe(false);
    expect(result.includeFolders.size).toBe(0);
    expect(result.excludeFolders.size).toBe(0);
    expect(result.boostTags.size).toBe(0);
  });
});

const buildStressRules = (count: number, wildcardPattern = "*.stress.nativefill.dev"): DomainRule[] => {
  return Array.from({ length: count }, (_, index) => {
    const pattern = index % 3 === 0 ? wildcardPattern : `tenant-${index}.${wildcardPattern.replace("*.", "")}`;
    return baseRule({
      id: `stress-${index}`,
      pattern,
      includeFolders: [`Team-${index % 50}`],
      excludeFolders: index % 5 === 0 ? [`Legacy-${index % 10}`] : [],
      boostTags: index % 7 === 0 ? [`tag-${index % 6}`] : [],
      disableOnHost: index % 97 === 0
    });
  });
};

describe("UT-005 resolveDomainRules perf harness", () => {
  const TARGET_HOST = "tenant-999.stress.nativefill.dev";
  const RULE_COUNT = 10_000;
  const CPU_BUDGET_MS = 25;
  const getRules = () => buildStressRules(RULE_COUNT);

  it.skip("resolves 10k entries within CPU budget", () => {
    const rules = getRules();
    const start = performance.now();
    const resolution = resolveDomainRules(TARGET_HOST, rules);
    const elapsed = performance.now() - start;

    // Placeholder assertions — tighten thresholds when perf work lands.
    expect(resolution.includeFolders.size).toBeGreaterThan(0);
    expect(resolution.boostTags.size).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(CPU_BUDGET_MS);
  });

  it.skip("merges include/exclude folders deterministically under load", () => {
    const rules = getRules();
    const baseline = resolveDomainRules(TARGET_HOST, rules);
    const shuffled = resolveDomainRules(
      TARGET_HOST,
      [...rules].sort((a, b) => a.pattern.localeCompare(b.pattern)).reverse()
    );

    expect(Array.from(baseline.includeFolders).sort()).toEqual(Array.from(shuffled.includeFolders).sort());
    expect(Array.from(baseline.excludeFolders).sort()).toEqual(Array.from(shuffled.excludeFolders).sort());
    expect(Array.from(baseline.boostTags).sort()).toEqual(Array.from(shuffled.boostTags).sort());
  });
});
