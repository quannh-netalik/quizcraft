import { setIcon } from "obsidian";
import { guard, wrapChildren } from "../../lib/dom";
import { shuffled } from "../../lib/shuffle";
import { answerOf, type QuizCallout } from "./card";
import { gradedFooter } from "./footer";
import type { Widget } from "../registry";

export const ORDER_SELECTOR = '.callout[data-callout="quiz"][data-callout-metadata="order"]';

/** The right order: the numbered list in the answer section, one step per item. */
export function orderKey(qa: HTMLElement | undefined): string[] {
  return [...(qa?.querySelectorAll(".eq-qa-body > ol > li") ?? [])].map((li) => li.textContent?.trim() ?? "");
}

/** For each position, whether the step there is the one the key puts there. */
export function gradeOrder(steps: readonly string[], key: readonly string[]): boolean[] {
  return steps.map((step, i) => step === key[i]);
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
  const key = orderKey(answerOf(callout));
  if (!content || !list || key.length < 2) return;
  callout.dataset.eqOrder = "1";
  callout.classList.add("eq-quiz", "eq-order");
  const steps = [...list.children].filter((li): li is HTMLElement => li.tagName === "LI");

  // The held tile follows the pointer; tiles it passes slide up or down by its
  // height. The DOM, and so the step numbers, change only on release.
  const startDrag = (li: HTMLElement, e: PointerEvent) => {
    if (callout.classList.contains("eq-done") || e.button !== 0) return;
    // a touch elsewhere on the tile scrolls the page; only the grip drags
    if (e.pointerType === "touch" && !(e.target instanceof Element && e.target.closest(".eq-grip"))) return;
    e.preventDefault();
    const items = [...list.children] as HTMLElement[];
    const from = items.indexOf(li);
    // Measure once, before anything moves: reading rects on every pointermove
    // forces a layout per event, and the transforms set below would skew them.
    const rects = items.map((n) => n.getBoundingClientRect());
    const held = rects[from];
    if (!held) return;
    const gap = (rects[1]?.top ?? 0) - (rects[0]?.bottom ?? 0);
    const step = held.height + Math.max(gap, 0);
    const y0 = e.clientY;
    let to = from;
    li.classList.add("eq-dragging");
    list.classList.add("eq-sorting");
    // one signal removes every drag listener at once, however the drag ends
    const drag = new AbortController();
    const move = (ev: PointerEvent) => {
      // the note re-rendered mid-drag: this tile is gone, so stop listening
      if (!li.isConnected) {
        drag.abort();
        return;
      }
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
    // pointercancel (the OS takes the touch, say) and losing window focus end
    // the drag like a release; without them the tile stays lifted
    const up = () => {
      drag.abort();
      // where the held tile is drawn now, before the DOM catches up
      const before = li.getBoundingClientRect().top;
      // no transition while the other tiles snap back into their DOM slots
      list.classList.remove("eq-sorting");
      for (const n of items) n.style.transform = "";
      const target = items[to];
      if (to > from) target?.after(li);
      if (to < from) target?.before(li);
      // FLIP: start the tile where it was dropped, then let it glide into its slot
      li.style.transform = `translateY(${before - li.getBoundingClientRect().top}px)`;
      li.getBoundingClientRect(); // force layout so the start position applies
      li.classList.remove("eq-dragging");
      li.classList.add("eq-dropping");
      li.style.transform = "";
      window.setTimeout(() => li.classList.remove("eq-dropping"), 200);
    };
    const { signal } = drag;
    document.addEventListener("pointermove", move, { signal });
    document.addEventListener("pointerup", up, { signal });
    document.addEventListener("pointercancel", up, { signal });
    window.addEventListener("blur", up, { signal });
  };

  for (const li of steps) {
    li.dataset.step = li.textContent?.trim() ?? "";
    li.classList.add("eq-step");
    wrapChildren(li, "eq-step-text");
    setIcon(li.createSpan({ cls: "eq-grip" }), "grip-vertical");
    li.addEventListener("pointerdown", (e) => startDrag(li, e));
    // a click reaching Live Preview would move the cursor into the callout source
    guard(li, () => {});
    // keyboard: focus a tile, then ArrowUp / ArrowDown moves it one place
    li.tabIndex = 0;
    li.addEventListener("keydown", (e) => {
      if (callout.classList.contains("eq-done") || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
      e.preventDefault();
      e.stopPropagation();
      const prev = li.previousElementSibling;
      const next = li.nextElementSibling;
      if (e.key === "ArrowUp") prev?.before(li);
      if (e.key === "ArrowDown") next?.after(li);
      li.focus();
    });
  }
  // the steps start in random order, never already solved; Try again deals again
  const deal = () => {
    for (const li of shuffled(steps, inKeyOrder(key))) list.append(li);
  };
  deal();

  gradedFooter(
    callout,
    content,
    () => {
      const current = [...list.children] as HTMLElement[];
      const marks = gradeOrder(
        current.map((li) => li.dataset.step ?? ""),
        key,
      );
      for (const [i, li] of current.entries()) li.classList.add(marks[i] ? "eq-correct" : "eq-wrong");
      return { right: marks.filter(Boolean).length, total: key.length };
    },
    () => {
      for (const li of steps) li.classList.remove("eq-correct", "eq-wrong");
      deal();
    },
  );
}

export const orderQuiz: Widget = {
  name: "order-quiz",
  selector: ORDER_SELECTOR,
  setup: (callout) => setupOrder(callout),
};
