import { test, expect } from "@playwright/test";
import { tsScore } from "../../src/utils/fuzzy/ts-score";

test("tsScore rewards contiguous matches", () => {
  const strong = tsScore("kon", "konrad email");
  const weak = tsScore("kon", "k n r a d");
  expect(strong).toBeGreaterThan(weak);
});
