import { beforeEach, describe, expect, test } from "bun:test";
import { LANGUAGE_KEY, setupCode } from "../../src/widgets/code/code";
import { setupTabs } from "../../src/widgets/code/tabs";
import { click } from "../helpers/dom";

/** A nested `[!tab] name` callout holding `body`. */
const tab = (name: string, body = `<pre><code>${name}</code></pre>`, meta = "") =>
  `<div class="callout" data-callout="tab"${meta ? ` data-callout-metadata="${meta}"` : ""}>
    <div class="callout-title"><div class="callout-title-inner">${name}</div></div>
    <div class="callout-content">${body}</div>
  </div>`;

const box = (type: string, title: string, body: string) =>
  `<div class="callout" data-callout="${type}">
    <div class="callout-title"><div class="callout-title-inner">${title}</div></div>
    <div class="callout-content">${body}</div>
  </div>`;

const buttons = (el: Element) => [...el.querySelectorAll<HTMLElement>(".eq-tab")];
const active = (el: Element) => el.querySelector(".eq-tab.is-active")?.textContent;

/** One [!code] editor per language list, all set up. */
function editors(...langs: string[][]): HTMLElement[] {
  document.body.innerHTML = langs.map((l) => box("code", "Example", l.map((n) => tab(n)).join(""))).join("");
  const els = [...document.body.children] as HTMLElement[];
  for (const el of els) setupCode(el);
  return els;
}

beforeEach(() => localStorage.clear());

describe("setupTabs", () => {
  test("one button per tab, first one active", () => {
    document.body.innerHTML = box("tabs", "Setup", tab("macOS") + tab("Linux"));
    const el = document.body.firstElementChild as HTMLElement;
    setupTabs(el);
    expect(buttons(el).map((b) => b.textContent)).toEqual(["macOS", "Linux"]);
    expect(active(el)).toBe("macOS");
    expect(el.querySelector(".eq-tabpanel.is-active")?.textContent).toContain("macOS");
  });

  test("clicking a tab shows its panel", () => {
    document.body.innerHTML = box("tabs", "Setup", tab("macOS") + tab("Linux"));
    const el = document.body.firstElementChild as HTMLElement;
    setupTabs(el);
    click(buttons(el)[1]!);
    expect(active(el)).toBe("Linux");
    expect(el.querySelectorAll(".eq-tabpanel.is-active")).toHaveLength(1);
  });

  test("adds the icon named in the metadata", () => {
    document.body.innerHTML = box("tabs", "Setup", tab("Leaf", "x", "leaf"));
    const el = document.body.firstElementChild as HTMLElement;
    setupTabs(el);
    expect(el.querySelector<HTMLElement>(".eq-tab-icon")?.dataset.icon).toBe("leaf");
  });

  test("runs once per box", () => {
    document.body.innerHTML = box("tabs", "Setup", tab("A") + tab("B"));
    const el = document.body.firstElementChild as HTMLElement;
    setupTabs(el);
    setupTabs(el);
    expect(el.querySelectorAll(".eq-tabbar")).toHaveLength(1);
  });

  test("marks a default title", () => {
    document.body.innerHTML = box("tabs", "Tabs", tab("A"));
    const el = document.body.firstElementChild as HTMLElement;
    setupTabs(el);
    expect(el.classList.contains("eq-notitle")).toBe(true);
  });
});

describe("setupCode language sync", () => {
  test("picking a language switches the other editors", () => {
    const [a, b] = editors(["Go", "Python"], ["Go", "Python"]);
    click(buttons(a!)[1]!);
    expect(active(b!)).toBe("Python");
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe("Python");
  });

  test("an editor without the language keeps its tab", () => {
    const [a, , c] = editors(["Go", "Python"], ["Go"], ["Rust", "Go"]);
    click(buttons(c!)[1]!);
    expect(active(a!)).toBe("Go");
    click(buttons(a!)[1]!);
    expect(active(c!)).toBe("Go");
  });

  test("new editors start on the remembered language", () => {
    localStorage.setItem(LANGUAGE_KEY, "Python");
    const [a, b] = editors(["Go", "Python"], ["Go"]);
    expect(active(a!)).toBe("Python");
    expect(active(b!)).toBe("Go");
  });
});
