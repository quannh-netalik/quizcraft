import { describe, expect, test } from "bun:test";
import { grade, optionLetter } from "../src/parse";

describe("optionLetter", () => {
  test.each([
    ["A) one", "A"],
    ["B. two", "B"],
    ["  C) indented", "C"],
    ["D)", "D"],
  ])("reads %p as %p", (text, letter) => {
    expect(optionLetter(text)).toBe(letter);
  });

  test.each([["a) lowercase"], ["AB) two letters"], ["A)no space"], ["(A) parenthesised"], ["plain text"], [""]])(
    "rejects %p",
    (text) => {
      expect(optionLetter(text)).toBeUndefined();
    },
  );
});

describe("grade", () => {
  const letters = ["A", "B", "C", "D"];

  test("single answer picked right", () => {
    const g = grade(letters, ["B"], ["B"]);
    expect(g.right).toBe(true);
    expect(g.marks.get("B")).toBe("correct");
    expect(g.marks.get("A")).toBeUndefined();
  });

  test("single answer picked wrong marks the key as missed", () => {
    const g = grade(letters, ["A"], ["B"]);
    expect(g.right).toBe(false);
    expect(g.marks.get("A")).toBe("wrong");
    expect(g.marks.get("B")).toBe("missed");
  });

  test("multi answer needs every key letter", () => {
    expect(grade(letters, ["A", "C"], ["A", "C"]).right).toBe(true);
    const partial = grade(letters, ["A"], ["A", "C"]);
    expect(partial.right).toBe(false);
    expect(partial.marks.get("C")).toBe("missed");
  });

  test("an extra pick fails a multi answer", () => {
    const g = grade(letters, ["A", "C", "D"], ["A", "C"]);
    expect(g.right).toBe(false);
    expect(g.marks.get("D")).toBe("wrong");
  });

  test("pick order does not matter", () => {
    expect(grade(letters, ["C", "A"], ["A", "C"]).right).toBe(true);
  });

  test("an empty key is never right", () => {
    expect(grade(letters, [], []).right).toBe(false);
  });
});
