import { describe, expect, test } from "bun:test";
import { setupCarousel } from "../../src/widgets/carousel/carousel";
import { callout, click } from "../helpers/dom";

/** `n` bare image embeds, the way Obsidian renders them before the images load. */
const embeds = (...alts: string[]) =>
  `<p>${alts.map((a) => `<span class="internal-embed" alt="${a}" src="${a}"></span>`).join("<br>")}</p>`;

function carousel(...alts: string[]): HTMLElement {
  const el = callout("carousel", embeds(...alts));
  setupCarousel(el);
  return el;
}

const q = <T extends HTMLElement>(el: HTMLElement, sel: string) => el.querySelector<T>(sel)!;
const activeIndex = (el: HTMLElement) =>
  [...el.querySelectorAll(".eq-car-slide")].findIndex((s) => s.classList.contains("is-active"));

function key(el: HTMLElement, k: string): void {
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
}

describe("setupCarousel", () => {
  test("ignores a single image", () => {
    const el = carousel("only.png");
    expect(el.classList.contains("eq-carousel")).toBe(false);
    expect(el.querySelector(".eq-car")).toBeNull();
  });

  test("starts on the first slide with prev and restart disabled", () => {
    const el = carousel("Step one", "Step two", "Step three");
    expect(activeIndex(el)).toBe(0);
    expect(q(el, ".eq-car-count").textContent).toBe("1 / 3");
    expect(q<HTMLButtonElement>(el, ".eq-car-prev").disabled).toBe(true);
    expect(q<HTMLButtonElement>(el, ".eq-car-restart").disabled).toBe(true);
    expect(q<HTMLButtonElement>(el, ".eq-car-next").disabled).toBe(false);
  });

  test("stops at the last slide", () => {
    const el = carousel("a", "b");
    const next = q<HTMLButtonElement>(el, ".eq-car-next");
    click(next);
    click(next);
    expect(activeIndex(el)).toBe(1);
    expect(next.disabled).toBe(true);
    expect(q<HTMLButtonElement>(el, ".eq-car-prev").disabled).toBe(false);
  });

  test("restart goes back to the first slide", () => {
    const el = carousel("a", "b", "c");
    click(q(el, ".eq-car-stage"));
    click(q(el, ".eq-car-stage"));
    expect(activeIndex(el)).toBe(2);
    click(q(el, ".eq-car-restart"));
    expect(activeIndex(el)).toBe(0);
  });

  test("arrow keys page and clamp", () => {
    const el = carousel("a", "b");
    const wrap = q(el, ".eq-car");
    key(wrap, "ArrowLeft");
    expect(activeIndex(el)).toBe(0);
    key(wrap, "ArrowRight");
    expect(activeIndex(el)).toBe(1);
    key(wrap, "ArrowRight");
    expect(activeIndex(el)).toBe(1);
  });

  test("is idempotent", () => {
    const el = carousel("a", "b");
    setupCarousel(el);
    expect(el.querySelectorAll(".eq-car")).toHaveLength(1);
  });
});
