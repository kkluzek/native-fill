import { describe, expect, expectTypeOf, it } from "vitest";
import type { NativeFillMessage } from "../../src/types/messages";
import type { NativeFillState } from "../../src/types/data";
import { nativeFillMessageSchema } from "../../src/types/contracts";

const buildStateFixture = (): NativeFillState => ({
  items: [
    {
      id: "item-1",
      label: "Support email",
      value: "support@nativefill.dev",
      type: "singleline",
      tags: ["email", "support"],
      aliases: ["helpdesk"],
      profile: "CX",
      folder: "Contacts",
      createdAt: "2025-01-02T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z"
    }
  ],
  domainRules: [
    {
      id: "rule-1",
      pattern: "*.nativefill.dev",
      includeFolders: ["Contacts"],
      excludeFolders: ["Legacy"],
      boostTags: ["priority"],
      disableOnHost: false,
      createdAt: "2025-01-02T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z"
    }
  ],
  settings: {
    onboardingCompleted: true,
    shortcuts: {
      openDropdown: "Alt+J",
      forceDropdown: "Alt+ArrowDown"
    },
    theme: "system",
    maxSuggestions: 6
  }
});

describe("NativeFill message contracts (UT-006)", () => {
  it("provides a canonical data payload sample", () => {
    const state = buildStateFixture();
    const message: NativeFillMessage = {
      type: "nativefill:data",
      state
    };

    expect(message.state.items[0].label).toContain("Support");
    expect(message.state.domainRules[0].pattern).toBe("*.nativefill.dev");
  });

  it("asserts shortcuts schema via expectTypeOf", () => {
    expectTypeOf<NativeFillState["settings"]["shortcuts"]>().toEqualTypeOf<{
      openDropdown: string;
      forceDropdown: string;
    }>();
  });

  it("validates discriminated union with zod", () => {
    const valid = {
      type: "nativefill:data",
      state: buildStateFixture()
    } satisfies NativeFillMessage;

    expect(() => nativeFillMessageSchema.parse(valid)).not.toThrow();

    expect(() =>
      nativeFillMessageSchema.parse({ type: "nativefill:apply-value", value: 123 })
    ).toThrowError();

    expect(() =>
      nativeFillMessageSchema.parse({ type: "nativefill:dropdown-toggle", reason: "invalid" })
    ).toThrowError();
  });
});
