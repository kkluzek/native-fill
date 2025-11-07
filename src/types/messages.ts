import type { NativeFillItem, NativeFillState } from "@types/data";

export type NativeFillMessage =
  | { type: "nativefill:get-state" }
  | { type: "nativefill:upsert-item"; item: Partial<NativeFillItem> & { value: string; label: string } }
  | { type: "nativefill:delete-item"; id: string }
  | { type: "nativefill:context-fill"; itemId: string }
  | { type: "nativefill:apply-value"; value: string }
  | { type: "nativefill:data"; state: NativeFillState }
  | { type: "nativefill:dropdown-toggle"; reason: "shortcut" | "context" }
  | { type: "nativefill:ping" };

export interface NativeFillPortMessage {
  topic: string;
  payload?: unknown;
}
