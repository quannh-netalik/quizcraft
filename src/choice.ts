import { keyLetters } from "./answer";
import { guard } from "./lib/dom";
import { grade, optionLetter } from "./parse";
import { QUIZ_SELECTOR, type QuizCallout } from "./quiz";
import type { Widget } from "./widgets";

/** The letter an option has in the markdown; grading always uses it. */
const letterOf = (li: HTMLElement): string => li.dataset.eqLetter ?? "";

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
  callout.classList.add("eq-quiz");
  // more than one key line = pick several (checkboxes), otherwise one (radios).
  // The question can also say so itself, for a multi-select quiz with one right option.
  const qa = callout.eqQa;
  const question = [...content.childNodes].filter((n) => n !== qa).map((n) => n.textContent).join(" ");
  const multi = (qa ? keyLetters(qa) : []).length > 1 || /multi-select/i.test(question);
  callout.classList.add(multi ? "eq-multi" : "eq-single");

  // footer sits between the options and the answer section
  const footer = createDiv({ cls: "eq-footer" });
  content.insertBefore(footer, qa ?? null);
  // the answer stays hidden until Submit, so it cannot be peeked at
  if (qa && keyLetters(qa).length) qa.classList.add("eq-answer");
  const status = footer.createSpan({ cls: "eq-status" });
  const btn = footer.createEl("button", { cls: "eq-btn", text: "Submit Answer" });
  // submitting nothing would just show every option as missed
  btn.disabled = true;
  const submitted = () => callout.classList.contains("eq-done");
  const reset = () => {
    callout.classList.remove("eq-done");
    for (const li of options) li.classList.remove("eq-selected", "eq-correct", "eq-wrong", "eq-missed");
    status.setText("");
    status.className = "eq-status";
    btn.setText("Submit Answer");
    btn.disabled = true;
    qa?.classList.remove("eq-revealed", "is-open");
  };
  guard(btn, () => {
    if (submitted()) {
      reset();
      return;
    }
    const key = qa ? keyLetters(qa) : [];
    if (!key.length) {
      // grading would mark every pick wrong; say what is missing instead
      status.setText("No answer key found");
      return;
    }
    const picked = options.filter((li) => li.classList.contains("eq-selected")).map(letterOf);
    const { right, marks } = grade(options.map(letterOf), picked, key);
    callout.classList.add("eq-done");
    for (const li of options) {
      li.classList.remove("eq-selected");
      const mark = marks.get(letterOf(li));
      if (mark) li.classList.add(`eq-${mark}`);
    }
    status.setText(right ? "Correct!" : "Not quite");
    status.className = `eq-status ${right ? "is-right" : "is-wrong"}`;
    qa?.classList.add("eq-revealed", "is-open");
    btn.setText("Try again");
  });

  for (const li of options) {
    li.dataset.eqLetter = optionLetter(li.textContent ?? "");
    li.classList.add("eq-option");
    guard(li, () => {
      if (submitted()) return;
      if (multi) li.classList.toggle("eq-selected");
      else {
        for (const o of options) o.classList.remove("eq-selected");
        li.classList.add("eq-selected");
      }
      btn.disabled = !options.some((o) => o.classList.contains("eq-selected"));
    });
  }
}

export const choiceQuiz: Widget = {
  name: "choice-quiz",
  selector: QUIZ_SELECTOR,
  setup: (callout) => setupChoice(callout),
};
