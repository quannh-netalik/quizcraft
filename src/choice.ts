import { guard } from "./lib/dom";
import { optionLetter } from "./parse";
import { QUIZ_SELECTOR, type QuizCallout } from "./quiz";
import type { Widget } from "./widgets";

/**
 * [!quiz] with 2+ lettered options (`- A) text`): pick and submit.
 * Each option keeps the letter it has in the markdown in data-eq-letter.
 */
export function setupChoice(callout: QuizCallout): void {
  if (callout.dataset.eqReady) return;
  const content = callout.querySelector<HTMLElement>(":scope > .callout-content");
  const list = content?.querySelector<HTMLElement>(":scope > ul");
  if (!content || !list) return;
  const options = [...list.children].filter(
    (li): li is HTMLElement => li.tagName === "LI" && optionLetter(li.textContent ?? "") !== undefined,
  );
  if (options.length < 2) return;
  callout.dataset.eqReady = "1";
  callout.classList.add("eq-quiz", "eq-single");
  for (const li of options) {
    li.dataset.eqLetter = optionLetter(li.textContent ?? "");
    li.classList.add("eq-option");
    guard(li, () => {
      for (const o of options) o.classList.remove("eq-selected");
      li.classList.add("eq-selected");
    });
  }
}

export const choiceQuiz: Widget = {
  name: "choice-quiz",
  selector: QUIZ_SELECTOR,
  setup: (callout) => setupChoice(callout),
};
