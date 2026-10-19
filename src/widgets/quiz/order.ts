import { setIcon } from "obsidian";
import { wrapChildren } from "../../lib/dom";
import { shuffled } from "../../lib/shuffle";
import type { QuizCallout } from "./card";
import type { Widget } from "../registry";

export const ORDER_SELECTOR = '.callout[data-callout="quiz"][data-callout-metadata="order"]';

/** The right order: the numbered list in the answer section, one step per item. */
export function orderKey(qa: HTMLElement | undefined): string[] {
  return [...(qa?.querySelectorAll(".eq-qa-body > ol > li") ?? [])].map((li) => li.textContent?.trim() ?? "");
}

/** True when the steps already stand in the answer order. */
export const inKeyOrder =
  (key: readonly string[]) =>
  (steps: readonly HTMLElement[]): boolean =>
    steps.every((li, i) => li.dataset.step === key[i]);

/**
 * `> [!quiz|order]`: the bullet list holds the steps, the numbered list after
 * `==Answer==` gives the right order. The reader drags the steps into order.
 */
export function setupOrder(callout: QuizCallout): void {
  if (callout.dataset.eqOrder) return;
  const content = callout.querySelector<HTMLElement>(":scope > .callout-content");
  const list = content?.querySelector<HTMLElement>(":scope > ul");
  const key = orderKey(callout.eqQa);
  if (!content || !list || key.length < 2) return;
  callout.dataset.eqOrder = "1";
  callout.classList.add("eq-quiz", "eq-order");
  const steps = [...list.children].filter((li): li is HTMLElement => li.tagName === "LI");

  // The held tile follows the pointer; tiles it passes slide up or down by its
  // height. The DOM, and so the step numbers, change only on release.
  const startDrag = (li: HTMLElement, e: PointerEvent) => {
    if (callout.classList.contains("eq-done") || e.button !== 0) return;
    e.preventDefault();
    const items = [...list.children] as HTMLElement[];
    const from = items.indexOf(li);
    const y0 = e.clientY;
    let to = from;
    li.classList.add("eq-dragging");
    list.classList.add("eq-sorting");
    const move = (ev: PointerEvent) => {
      const rects = items.map((n) => n.getBoundingClientRect());
      const held = rects[from];
      if (!held) return;
      const gap = (rects[1]?.top ?? 0) - (rects[0]?.bottom ?? 0);
      const step = held.height + Math.max(gap, 0);
      const dy = ev.clientY - y0;
      li.style.transform = `translateY(${dy}px) scale(1.02)`;
      const mid = held.top + held.height / 2 + dy;
      to = from;
      for (const [k, r] of rects.entries()) {
        const centre = r.top + r.height / 2;
        if (k > from && mid > centre) to = k;
        if (k < from && mid < centre && k < to) to = k;
      }
      for (const [k, n] of items.entries()) {
        if (k === from) continue;
        const shift = from < k && k <= to ? -step : to <= k && k < from ? step : 0;
        n.style.transform = shift ? `translateY(${shift}px)` : "";
      }
    };
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      list.classList.remove("eq-sorting");
      for (const n of items) n.style.transform = "";
      li.classList.remove("eq-dragging");
      const target = items[to];
      if (to !== from && target) list.insertBefore(li, to > from ? target.nextSibling : target);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  for (const li of steps) {
    li.dataset.step = li.textContent?.trim() ?? "";
    li.classList.add("eq-step");
    wrapChildren(li, "eq-step-text");
    setIcon(li.createSpan({ cls: "eq-grip" }), "grip-vertical");
    li.addEventListener("pointerdown", (e) => startDrag(li, e));
  }
  // the steps start in random order, never already solved
  for (const li of shuffled(steps, inKeyOrder(key))) list.appendChild(li);
}

export const orderQuiz: Widget = {
  name: "order-quiz",
  selector: ORDER_SELECTOR,
  setup: (callout) => setupOrder(callout),
};
