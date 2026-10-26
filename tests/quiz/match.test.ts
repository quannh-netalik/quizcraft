import { describe, expect, test } from "bun:test";
import { Menu } from "../stubs/obsidian";
import { answerOf, setupCard } from "../../src/widgets/quiz/card";
import { choose, gradeMatch, matchKey, setupMatch } from "../../src/widgets/quiz/match";
import { callout, click, content } from "../helpers/dom";

const PAIRS: [string, string][] = [
  ["HTTP", "Port 80"],
  ["HTTPS", "Port 443"],
  ["SSH", "Port 22"],
];

const list = (items: string[]) => `<ul>${items.map((t) => `<li>${t}</li>`).join("")}</ul>`;

/** A match quiz built from PAIRS, set up like the plugin does. */
function quiz(): HTMLElement {
  const answer = `<ul>${PAIRS.map(([l, r]) => `<li>${l} \u2192 <strong>${r}</strong></li>`).join("")}</ul>`;
  const body =
    `<p>Match each protocol to its port.</p>` +
    `<p><strong>Protocol</strong></p>${list(PAIRS.map(([l]) => l))}` +
    `<p><strong>Port</strong></p>${list(["Port 22", "Port 80", "Port 443"])}` +
    `<p><mark>Answer</mark></p>${answer}`;
  const el = callout("quiz", body, { meta: "match" });
  setupCard(el);
  setupMatch(el);
  return el;
}

const row = (el: HTMLElement, left: string) =>
  [...content(el).querySelectorAll<HTMLElement>("li.eq-match-row")].find(
    (li) => li.querySelector(".eq-match-left")?.textContent === left,
  )!;

const titleText = (t: string | DocumentFragment) => (typeof t === "string" ? t : (t.textContent ?? ""));

/** Open row `left`'s picker and click choice `c`. */
function pick(el: HTMLElement, left: string, c: string): void {
  click(row(el, left).querySelector(".eq-match-pick")!);
  const item = Menu.last!.items.find((it) => titleText(it.title).startsWith(c))!;
  item.handler();
}

const shown = (el: HTMLElement, left: string) => row(el, left).querySelector(".eq-match-val")?.textContent;

describe("choose", () => {
  test("fills an empty row", () => {
    expect(choose(["", "", ""], 1, "b")).toEqual(["", "b", ""]);
  });

  test("swaps with the row that holds the choice", () => {
    expect(choose(["a", "b", ""], 1, "a")).toEqual(["b", "a", ""]);
    expect(choose(["a", "", ""], 2, "a")).toEqual(["", "", "a"]);
  });

  test("picking the same choice again changes nothing", () => {
    expect(choose(["a", "b"], 0, "a")).toEqual(["a", "b"]);
  });
});

describe("gradeMatch", () => {
  test("marks each row", () => {
    expect(gradeMatch(["x", "b", ""], ["a", "b", "c"])).toEqual([false, true, false]);
  });
});

describe("setupMatch", () => {
  test("reads the key in left-list order", () => {
    const el = quiz();
    expect(matchKey(answerOf(el))).toEqual(PAIRS.map(([, r]) => r));
    expect(el.classList.contains("eq-match")).toBe(true);
  });

  test("offers every choice once and swaps on a taken choice", () => {
    const el = quiz();
    expect(shown(el, "SSH")).toBe("Select a match");
    pick(el, "HTTP", "Port 22");
    expect(Menu.last!.items).toHaveLength(3);
    pick(el, "SSH", "Port 22");
    expect(shown(el, "SSH")).toBe("Port 22");
    expect(shown(el, "HTTP")).toBe("Select a match");
  });

  test("names the row that holds a taken choice", () => {
    const el = quiz();
    pick(el, "HTTP", "Port 22");
    click(row(el, "SSH").querySelector(".eq-match-pick")!);
    const titles = Menu.last!.items.map((it) => titleText(it.title));
    expect(titles).toContain("Port 22 \u00b7 HTTP");
    expect(titles).toContain("Port 80");
  });

  test("enables Submit once every row has a pick", () => {
    const el = quiz();
    const btn = el.querySelector<HTMLButtonElement>(".eq-btn")!;
    expect(btn.disabled).toBe(true);
    pick(el, "HTTP", "Port 80");
    pick(el, "HTTPS", "Port 22");
    expect(btn.disabled).toBe(true);
    pick(el, "SSH", "Port 443");
    expect(btn.disabled).toBe(false);
  });

  test("grades rows and shows the fix under a wrong pick", () => {
    const el = quiz();
    pick(el, "HTTP", "Port 80");
    pick(el, "HTTPS", "Port 22");
    pick(el, "SSH", "Port 443");
    click(el.querySelector(".eq-btn")!);
    expect(row(el, "HTTP").classList.contains("eq-correct")).toBe(true);
    expect(row(el, "HTTPS").querySelector(".eq-match-fix")?.textContent).toBe("Port 443");
    expect(el.querySelector(".eq-status")!.textContent).toBe("Not quite: 1 of 3 right");
  });

  test("Try again clears picks and results and deals the rows again", () => {
    const el = quiz();
    pick(el, "HTTP", "Port 80");
    pick(el, "HTTPS", "Port 443");
    pick(el, "SSH", "Port 22");
    const btn = el.querySelector<HTMLButtonElement>(".eq-btn")!;
    click(btn);
    expect(el.querySelector(".eq-status")!.textContent).toBe("Correct!");
    click(btn);
    expect(el.classList.contains("eq-done")).toBe(false);
    expect(el.querySelectorAll(".eq-match-result, .eq-correct, .eq-wrong")).toHaveLength(0);
    expect(shown(el, "HTTP")).toBe("Select a match");
    expect(btn.disabled).toBe(true);
    // rows never come back in markdown order
    const lefts = [...content(el).querySelectorAll(".eq-match-left")].map((n) => n.textContent);
    expect(lefts).not.toEqual(PAIRS.map(([l]) => l));
  });

  test("ignores a quiz whose key does not cover every row", () => {
    const el = callout(
      "quiz",
      "<ul><li>a</li><li>b</li></ul><ul><li>x</li><li>y</li></ul><p><mark>Answer</mark></p><ul><li>a <strong>x</strong></li></ul>",
      { meta: "match" },
    );
    setupCard(el);
    setupMatch(el);
    expect(el.classList.contains("eq-match")).toBe(false);
  });
});
