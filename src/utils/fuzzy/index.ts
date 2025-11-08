import type { DomainRuleResolution, NativeFillItem } from "@types/data";
import wasmUrl from "@wasm/fuzzy_bg.wasm?url";
import { tsScore } from "./ts-score";
const encoder = new TextEncoder();

const setHarnessWasmMode = (mode: "wasm" | "fallback") => {
  if (typeof window !== "undefined") {
    (window as any).__nativefillWasmMode = mode;
  }
};

type MaybePromise<T> = T | Promise<T>;

type FuzzyWasmExports = {
  memory: WebAssembly.Memory;
  alloc: (len: number) => number;
  resetHeap: () => void;
  score: (qPtr: number, qLen: number, cPtr: number, cLen: number) => number;
};

export interface MatchOptions {
  limit?: number;
  resolution?: DomainRuleResolution;
}

export interface RankedItem {
  item: NativeFillItem;
  score: number;
  highlightedLabel: string;
}

const highlightQuery = (label: string, query: string) => {
  if (!query) return label;
  const normalizedLabel = label.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const index = normalizedLabel.indexOf(normalizedQuery);
  if (index === -1) return label;
  return `${label.slice(0, index)}<mark>${label.slice(index, index + query.length)}</mark>${label.slice(index + query.length)}`;
};

export class FuzzyEngine {
  #exports: FuzzyWasmExports | null = null;
  #loading: MaybePromise<FuzzyWasmExports | null> | null = null;

  async init() {
    if (this.#exports) return;
    if (!this.#loading) {
      this.#loading = this.#load();
    }
    this.#exports = (await this.#loading) ?? null;
  }

  async #load(): Promise<FuzzyWasmExports | null> {
    if (import.meta.env.SSR) {
      return null;
    }
    if (typeof window !== "undefined" && (window as any).__nativefillBlockWasm) {
      setHarnessWasmMode("fallback");
      return null;
    }
    try {
      const response = await fetch(wasmUrl);
      const bytes = await response.arrayBuffer();
      const { instance } = await WebAssembly.instantiate(bytes, {});
      setHarnessWasmMode("wasm");
      return instance.exports as FuzzyWasmExports;
    } catch (error) {
      console.warn("NativeFill: WASM fuzzy disabled, falling back to TS", error);
      setHarnessWasmMode("fallback");
      return null;
    }
  }

  #writeString(exports: FuzzyWasmExports, value: string) {
    const bytes = encoder.encode(value.toLowerCase());
    const ptr = exports.alloc(bytes.length);
    const view = new Uint8Array(exports.memory.buffer, ptr, bytes.length);
    view.set(bytes);
    return { ptr, length: bytes.length };
  }

  #scoreWithWasm(query: string, haystack: string) {
    const exp = this.#exports;
    if (!exp || !query) return Number.NaN;
    exp.resetHeap();
    const q = this.#writeString(exp, query);
    const c = this.#writeString(exp, haystack);
    return exp.score(q.ptr, q.length, c.ptr, c.length);
  }

  score(query: string, haystack: string) {
    if (!query) return 0;
    if (this.#exports) {
      try {
        const wasmScore = this.#scoreWithWasm(query, haystack);
        if (!Number.isNaN(wasmScore)) {
          return wasmScore;
        }
      } catch (error) {
        console.warn("NativeFill: WASM score failed", error);
      }
    }
    setHarnessWasmMode("fallback");
    return tsScore(query, haystack);
  }

  rank(query: string, items: NativeFillItem[], options?: MatchOptions): RankedItem[] {
    const limit = options?.limit ?? 6;
    const normalizedQuery = query.trim().toLowerCase();
    const resolution =
      options?.resolution ?? {
        disable: false,
        includeFolders: new Set<string>(),
        excludeFolders: new Set<string>(),
        boostTags: new Set<string>()
      };

    if (resolution.disable) {
      return [];
    }

    const filtered = items.filter((item) => {
      if (resolution.excludeFolders.size && resolution.excludeFolders.has(item.folder)) {
        return false;
      }
      if (resolution.includeFolders.size) {
        return resolution.includeFolders.has(item.folder);
      }
      return true;
    });

    const scored = filtered
      .map((item) => {
        const haystack = `${item.label} ${item.value} ${item.aliases.join(" ")}`;
        const baseScore = normalizedQuery ? this.score(normalizedQuery, haystack) : 0.5;
        let score = baseScore;
        const boostSet = resolution.boostTags;
        item.tags.forEach((tag) => {
          if (boostSet?.has(tag)) {
            score += 0.1;
          }
        });
        if (!normalizedQuery) {
          // prefer recently updated when no query
          const recencyWeight = Date.now() - new Date(item.updatedAt).getTime();
          score = 1 / Math.max(1, recencyWeight / 1_000_000);
        }
        return {
          item,
          score,
          highlightedLabel: highlightQuery(item.label, query)
        };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  }
}

export const fuzzyEngine = new FuzzyEngine();
