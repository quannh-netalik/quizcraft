import { describe, expect, test } from "bun:test";
import { decorateBody } from "../src/answer";

function body(html: string): HTMLElement {
  document.body.innerHTML = `<div class="eq-qa-body">${html}</div>`;
  return document.body.firstElementChild as HTMLElement;
}

describe("decorateBody", () => {
  test("turns a leading bold letter into a badge", () => {
    const el = body(`<p><strong>B)</strong> two</p>`);
    decorateBody(el);
    const p = el.querySelector("p")!;
    expect(p.classList.contains("eq-key")).toBe(true);
    expect(p.querySelector<HTMLElement>(".eq-key-letter")!.dataset.letter).toBe("B");
    expect(p.querySelector(".eq-key-text")!.textContent).toBe(" two");
  });

  test("accepts the dot form", () => {
    const el = body(`<p><strong>C.</strong> three</p>`);
    decorateBody(el);
    expect(el.querySelector<HTMLElement>(".eq-key-letter")!.dataset.letter).toBe("C");
  });

  test("leaves bold text that is not a key alone", () => {
    const el = body(`<p>See <strong>B)</strong> above</p><p><strong>Note</strong> this</p>`);
    decorateBody(el);
    expect(el.querySelector(".eq-key")).toBeNull();
  });

  test("splits keys written on consecutive lines", () => {
    const el = body(`<p><strong>A)</strong> one<br>\n<strong>C)</strong> three</p><p>Why</p>`);
    decorateBody(el);
    const keys = [...el.querySelectorAll<HTMLElement>(".eq-key-letter")].map((k) => k.dataset.letter);
    expect(keys).toEqual(["A", "C"]);
    expect(el.querySelectorAll("br")).toHaveLength(0);
  });

  test("keeps line breaks inside an explanation", () => {
    const el = body(`<p>first line<br>second line</p>`);
    decorateBody(el);
    expect(el.querySelectorAll("p")).toHaveLength(1);
    expect(el.querySelectorAll("br")).toHaveLength(1);
  });

  test("marks the why-not heading and its list", () => {
    const el = body(`<p><strong>Why not the others</strong></p><ul><li>A is wrong</li></ul>`);
    decorateBody(el);
    expect(el.querySelector("p")!.classList.contains("eq-sub")).toBe(true);
    expect(el.querySelector("ul")!.classList.contains("eq-sub-list")).toBe(true);
  });

  test("runs once per body", () => {
    const el = body(`<p><strong>B)</strong> two</p>`);
    decorateBody(el);
    decorateBody(el);
    expect(el.querySelectorAll(".eq-key-text")).toHaveLength(1);
  });
});
