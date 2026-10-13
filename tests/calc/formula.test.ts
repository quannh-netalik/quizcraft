import { describe, expect, test } from "bun:test";
import { evaluate, FormulaError, parse, tokenize } from "../../src/widgets/calc/formula";

const CELLS: Record<string, number> = { A1: 2, B2: 10, C3: -4 };
const lookup = (key: string) => CELLS[key] ?? 0;
const calc = (src: string) => evaluate(parse(src), lookup);

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

describe("evaluate", () => {
  test.each([
    ["1 + 2 * 3", 7],
    ["(1 + 2) * 3", 9],
    ["10 - 4 - 3", 3],
    ["24 / 4 / 2", 3],
    ["2 * 3 ^ 2", 18],
    ["-3 ^ 2", -9],
    ["(-3) ^ 2", 9],
    ["2 ^ 10", 1024],
    ["--5", 5],
    ["+5 - -5", 10],
  ])("%p is %p", (src, want) => {
    expect(calc(src)).toBe(want);
  });

  test("reads cells through the lookup", () => {
    expect(calc("A1 * B2 + c3")).toBe(16);
    expect(calc("Z9 + 1")).toBe(1);
  });

  test("division by zero is not finite", () => {
    expect(calc("1 / 0")).toBe(Infinity);
    expect(calc("0 / 0")).toBeNaN();
  });

  test.each([["1 +"], ["(1 + 2"], ["1 2"], ["* 3"], ["()"]])("rejects %p", (src) => {
    expect(() => parse(src)).toThrow(FormulaError);
  });
});

describe("round, ceil and floor", () => {
  test.each([
    ["round(2.5)", 3],
    ["round(3.14159, 2)", 3.14],
    ["round(1234, -2)", 1200],
    ["ceil(1.01)", 2],
    ["ceil(1.231, 2)", 1.24],
    ["ceil(12, -1)", 20],
    ["floor(1.99)", 1],
    ["floor(1.239, 2)", 1.23],
    ["floor(-1.5)", -2],
    ["round(B2 / 3, 1)", 3.3],
    ["ROUND(A1 * 1.5)", 3],
  ])("%p is %p", (src, want) => {
    expect(calc(src)).toBe(want);
  });

  test.each([["sqrt(4)"], ["round()"], ["round(1, 2, 3)"], ["round 2"]])("rejects %p", (src) => {
    expect(() => parse(src)).toThrow(FormulaError);
  });
});
