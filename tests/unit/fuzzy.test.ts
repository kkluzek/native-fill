import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FuzzyEngine } from "../../src/utils/fuzzy";

vi.mock("../../src/utils/fuzzy/ts-score", async () => {
  const actual = await vi.importActual<typeof import("../../src/utils/fuzzy/ts-score")>(
    "../../src/utils/fuzzy/ts-score"
  );
  return {
    ...actual,
    tsScore: vi.fn(actual.tsScore)
  };
});

vi.mock("@wasm/fuzzy_bg.wasm?url", () => ({
  default: "wasm://mock"
}));

const getMockedTsScore = async () => {
  const module = await import("../../src/utils/fuzzy/ts-score");
  return module.tsScore as ReturnType<typeof vi.fn>;
};

describe("UT-003 fuzzyEngine WASM parity", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses WASM exports when available", async () => {
    const engine = new FuzzyEngine();
    const allocMock = vi.fn(() => 0);
    const resetHeapMock = vi.fn();
    const scoreMock = vi.fn(() => 0.9);
    const memory = new WebAssembly.Memory({ initial: 1 });

    vi.stubGlobal("fetch", vi.fn(async () => ({
      arrayBuffer: async () => new ArrayBuffer(8)
    })));
    vi.spyOn(WebAssembly, "instantiate").mockResolvedValue({
      instance: {
        exports: {
          memory,
          alloc: allocMock,
          resetHeap: resetHeapMock,
          score: scoreMock
        }
      }
    } as unknown as WebAssembly.WebAssemblyInstantiatedSource);

    await engine.init();
    const score = engine.score("abc", "abcdef");

    expect(scoreMock).toHaveBeenCalled();
    expect(score).toBeGreaterThan(0);
  });

  it("falls back to TS implementation when WASM fails", async () => {
    const engine = new FuzzyEngine();
    const tsScore = await getMockedTsScore();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    vi.stubGlobal("fetch", vi.fn(async () => ({
      arrayBuffer: async () => {
        throw new Error("network");
      }
    })));
    vi.spyOn(WebAssembly, "instantiate").mockRejectedValue(new Error("wasm unsupported"));

    await expect(engine.init()).resolves.not.toThrow();
    const score = engine.score("abc", "abcdef");

    expect(tsScore).toHaveBeenCalled();
    expect(score).toBeGreaterThan(0);
    expect(warnSpy).toHaveBeenCalled();
  });
});
