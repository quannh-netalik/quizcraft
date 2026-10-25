import { describe, expect, test } from "bun:test";
import { setupCard } from "../../src/widgets/quiz/card";
import { relabel, setupChoice } from "../../src/widgets/quiz/choice";
import { callout } from "../helpers/dom";

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

const texts = (el: HTMLElement) => [...el.querySelectorAll("li.eq-option")].map((o) => o.textContent?.trim());

describe("setupChoice shuffle setting", () => {
  const OPTIONS = ["A) one", "B) two", "C) three", "D) four", "E) five", "F) six"];

  function quiz(shuffle: boolean): HTMLElement {
    const el = callout("quiz", `<ul>${OPTIONS.map((o) => `<li>${o}</li>`).join("")}</ul><p><mark>Answer</mark></p><p>B) two</p>`);
    setupCard(el);
    setupChoice(el, { shuffle });
    return el;
  }

  test("keeps the markdown order when shuffling is off", () => {
    expect(texts(quiz(false))).toEqual(OPTIONS);
  });

  test("deals a new order when shuffling is on", () => {
    expect(texts(quiz(true))).not.toEqual(OPTIONS);
  });
});
