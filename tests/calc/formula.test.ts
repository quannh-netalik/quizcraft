import { describe, expect, test } from "bun:test";
import { FormulaError, tokenize } from "../../src/widgets/calc/formula";

describe("tokenize", () => {
  test("reads numbers, refs, names and operators", () => {
    expect(tokenize("round(b7 / 3, 2)")).toEqual([
      { kind: "name", name: "round" },
      { kind: "op", op: "(" },
      { kind: "ref", key: "B7" },
      { kind: "op", op: "/" },
      { kind: "num", value: 3 },
      { kind: "op", op: "," },
      { kind: "num", value: 2 },
      { kind: "op", op: ")" },
    ]);
  });

  test("reads decimals with and without a leading digit", () => {
    expect(tokenize("1.5+.25")).toEqual([
      { kind: "num", value: 1.5 },
      { kind: "op", op: "+" },
      { kind: "num", value: 0.25 },
    ]);
  });

  test("reads two-letter columns", () => {
    expect(tokenize("AA12^2")).toEqual([
      { kind: "ref", key: "AA12" },
      { kind: "op", op: "^" },
      { kind: "num", value: 2 },
    ]);
  });

  test("ignores spaces, including trailing ones", () => {
    expect(tokenize("  A1  ")).toEqual([{ kind: "ref", key: "A1" }]);
    expect(tokenize("")).toEqual([]);
  });

  test.each([["A1 % 2"], ["A1 = 2"], ["alert('x')"], ["A1;B1"]])("rejects %p", (src) => {
    expect(() => tokenize(src)).toThrow(FormulaError);
  });
});
