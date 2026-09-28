import { describe, expect, test } from "bun:test";
import { optionLetter } from "../src/parse";

describe("optionLetter", () => {
  test.each([
    ["A) one", "A"],
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
