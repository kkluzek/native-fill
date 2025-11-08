import { describe, expect, it } from "vitest";
import { hasBlockedAutocomplete, isFillableField, isSensitiveField } from "../../src/utils/fields";

describe("field filters", () => {
  it("rejects sensitive names", () => {
    const input = document.createElement("input");
    input.name = "userPassword";
    expect(isSensitiveField(input)).toBe(true);
    expect(isFillableField(input)).toBe(false);
  });

  it("rejects disallowed input types", () => {
    const input = document.createElement("input");
    input.type = "password";
    expect(isFillableField(input)).toBe(false);
  });

  it("rejects blocked autocomplete tokens", () => {
    const input = document.createElement("input");
    input.setAttribute("autocomplete", "cc-number");
    expect(hasBlockedAutocomplete(input)).toBe(true);
    expect(isFillableField(input)).toBe(false);
  });

  it("accepts standard text inputs", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.name = "full_name";
    expect(isFillableField(input)).toBe(true);
  });
});
