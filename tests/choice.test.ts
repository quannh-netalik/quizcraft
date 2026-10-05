import { describe, expect, test } from "bun:test";
import { relabel } from "../src/widgets/quiz/choice";

function li(html: string): HTMLElement {
  const el = document.createElement("li");
  el.innerHTML = html;
  return el;
}

describe("relabel", () => {
  test("swaps the leading letter and keeps the separator", () => {
    const el = li("B) two");
    relabel(el, "D");
    expect(el.textContent).toBe("D) two");
  });

  test("leaves a bold letter later in the option alone", () => {
    const el = li("A. pick <strong>B.</strong> first");
    relabel(el, "C");
    expect(el.textContent).toBe("C. pick B. first");
  });

  test("leaves a nested list alone", () => {
    const el = li("A) parent<ul><li>B) child</li></ul>");
    relabel(el, "B");
    expect(el.querySelector("ul")!.textContent).toBe("B) child");
    expect(el.firstChild!.textContent).toBe("B) parent");
  });

  test("skips the blank text node Obsidian puts first", () => {
    const el = li("\n<span>C) three</span>");
    relabel(el, "A");
    expect(el.textContent).toBe("\nA) three");
  });
});
