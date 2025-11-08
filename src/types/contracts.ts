import { z } from "zod";

const nativeFillItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  type: z.union([z.literal("singleline"), z.literal("multiline")]),
  tags: z.array(z.string()),
  aliases: z.array(z.string()),
  profile: z.string(),
  folder: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

const domainRuleSchema = z.object({
  id: z.string(),
  pattern: z.string(),
  includeFolders: z.array(z.string()),
  excludeFolders: z.array(z.string()),
  boostTags: z.array(z.string()),
  disableOnHost: z.boolean(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

const shortcutSettingsSchema = z.object({
  openDropdown: z.string(),
  forceDropdown: z.string()
});

const nativeFillSettingsSchema = z.object({
  onboardingCompleted: z.boolean(),
  shortcuts: shortcutSettingsSchema,
  theme: z.union([z.literal("system"), z.literal("dark"), z.literal("light")]),
  maxSuggestions: z.number().int().positive()
});

export const nativeFillStateSchema = z.object({
  items: z.array(nativeFillItemSchema),
  domainRules: z.array(domainRuleSchema),
  settings: nativeFillSettingsSchema
});

const upsertItemPayloadSchema = nativeFillItemSchema.partial().extend({
  value: z.string(),
  label: z.string()
});

export const nativeFillMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("nativefill:get-state") }),
  z.object({ type: z.literal("nativefill:upsert-item"), item: upsertItemPayloadSchema }),
  z.object({ type: z.literal("nativefill:delete-item"), id: z.string().min(1) }),
  z.object({ type: z.literal("nativefill:context-fill"), itemId: z.string().min(1) }),
  z.object({ type: z.literal("nativefill:apply-value"), value: z.string() }),
  z.object({ type: z.literal("nativefill:data"), state: nativeFillStateSchema }),
  z.object({
    type: z.literal("nativefill:dropdown-toggle"),
    reason: z.union([z.literal("shortcut"), z.literal("context")])
  }),
  z.object({ type: z.literal("nativefill:ping") })
]);

export type NativeFillStateSchema = z.infer<typeof nativeFillStateSchema>;
export type NativeFillMessageSchema = z.infer<typeof nativeFillMessageSchema>;

export const validateNativeFillMessage = (payload: unknown) => nativeFillMessageSchema.parse(payload);
