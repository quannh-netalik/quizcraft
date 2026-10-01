import { describe, expect, test } from "bun:test";
import { sameOrder, shuffled } from "../src/lib/shuffle";

/** A fake Math.random that replays `values` in a loop. */
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
};

describe("shuffled", () => {
  test("keeps every item exactly once", () => {
    const items = ["A", "B", "C", "D", "E"];
    const out = shuffled(items);
    expect(out).toHaveLength(items.length);
    expect(new Set(out)).toEqual(new Set(items));
  });

  test("does not mutate the input", () => {
    const items = [1, 2, 3];
    shuffled(items);
    expect(items).toEqual([1, 2, 3]);
  });

  test("returns short lists as a copy", () => {
    const one = ["A"];
    expect(shuffled(one)).toEqual(["A"]);
    expect(shuffled(one)).not.toBe(one);
  });

  test("retries until the order differs", () => {
    const items = ["A", "B", "C"];
    // 0.99 keeps every item in place (identity), then 0 deals a real shuffle
    const out = shuffled(items, sameOrder(items), seq(0.99, 0.99, 0, 0));
    expect(out).not.toEqual(items);
  });

  test("falls back to reversing when every deal matches", () => {
    const items = ["A", "B", "C"];
    expect(shuffled(items, sameOrder(items), () => 0.99)).toEqual(["C", "B", "A"]);
  });

  test("two items always swap when the original order is avoided", () => {
    const items = ["A", "B"];
    expect(shuffled(items, sameOrder(items), () => 0.99)).toEqual(["B", "A"]);
  });
});
