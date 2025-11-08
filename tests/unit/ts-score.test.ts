import { describe, expect, it } from "vitest";
import { tsScore } from "../../src/utils/fuzzy/ts-score";

describe("tsScore", () => {
  it("rewards contiguous matches more strongly", () => {
    const strong = tsScore("kon", "konrad email");
    const weak = tsScore("kon", "k n r a d");
    expect(strong).toBeGreaterThan(weak);
  });

  it("returns zero when query letters are missing", () => {
    expect(tsScore("xyz", "konrad")).toBe(0);
  });

  it("caps score to 1", () => {
    expect(tsScore("aa", "aaaa")).toBeLessThanOrEqual(1);
  });
});
