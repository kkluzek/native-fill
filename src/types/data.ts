export type NativeFillItemType = "singleline" | "multiline";

export interface NativeFillItem {
  id: string;
  label: string;
  value: string;
  type: NativeFillItemType;
  tags: string[];
  aliases: string[];
  profile: string;
  folder: string;
  createdAt: string;
  updatedAt: string;
}

export interface DomainRule {
  id: string;
  pattern: string;
  includeFolders: string[];
  excludeFolders: string[];
  boostTags: string[];
  disableOnHost: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShortcutSettings {
  openDropdown: string;
  forceDropdown: string;
}

export interface NativeFillSettings {
  onboardingCompleted: boolean;
  shortcuts: ShortcutSettings;
  theme: "system" | "dark" | "light";
  maxSuggestions: number;
}

export interface NativeFillState {
  items: NativeFillItem[];
  domainRules: DomainRule[];
  settings: NativeFillSettings;
}

export interface DomainRuleResolution {
  disable: boolean;
  includeFolders: Set<string>;
  excludeFolders: Set<string>;
  boostTags: Set<string>;
}
