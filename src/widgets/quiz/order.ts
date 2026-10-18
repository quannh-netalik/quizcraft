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
  for (const li of steps) {
    li.dataset.step = li.textContent?.trim() ?? "";
    li.classList.add("eq-step");
    wrapChildren(li, "eq-step-text");
    setIcon(li.createSpan({ cls: "eq-grip" }), "grip-vertical");
  }
  // the steps start in random order, never already solved
  for (const li of shuffled(steps, inKeyOrder(key))) list.appendChild(li);
}

export const orderQuiz: Widget = {
  name: "order-quiz",
  selector: ORDER_SELECTOR,
  setup: (callout) => setupOrder(callout),
};
