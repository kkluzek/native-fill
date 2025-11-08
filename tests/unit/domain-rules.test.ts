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
