import { test, expect } from "@playwright/test";
import type { DomainRule } from "../src/types/data";
import { resolveDomainRules } from "../src/utils/domain";

const rules: DomainRule[] = [
  {
    id: "1",
    pattern: "linkedin.com|*.linkedin.com",
    includeFolders: ["Work"],
    excludeFolders: ["Personal"],
    boostTags: ["outreach"],
    disableOnHost: false,
    notes: "",
    createdAt: "",
    updatedAt: ""
  },
  {
    id: "2",
    pattern: "*.example.com",
    includeFolders: [],
    excludeFolders: ["Finance"],
    boostTags: [],
    disableOnHost: true,
    notes: "",
    createdAt: "",
    updatedAt: ""
  }
];

test("resolveDomainRules honors precedence and disable", () => {
  const linkedin = resolveDomainRules("jobs.linkedin.com", rules);
  expect(linkedin.disable).toBeFalsy();
  expect(Array.from(linkedin.includeFolders)).toContain("Work");
  expect(Array.from(linkedin.excludeFolders)).toContain("Personal");

  const example = resolveDomainRules("login.example.com", rules);
  expect(example.disable).toBeTruthy();
  expect(example.excludeFolders.has("Finance")).toBeTruthy();
});
