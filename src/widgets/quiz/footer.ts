import { guard } from "../../lib/dom";
import type { QuizCallout } from "./card";

/** Result of grading a whole quiz: how many parts are right, out of how many. */
export interface Score {
  right: number;
  total: number;
}

/**
 * Footer shared by [!quiz|order] and [!quiz|match]. Submit Answer calls
 * `grade`, shows the score and opens the answer section; Try again calls
 * `clear`. Returns the button, so the widget can disable it until the reader
 * has answered.
 */
export function gradedFooter(
  callout: QuizCallout,
  content: HTMLElement,
  grade: () => Score,
  clear: () => void,
): HTMLButtonElement {
  const qa = callout.eqQa;
  const footer = createDiv({ cls: "eq-footer" });
  content.insertBefore(footer, qa ?? null);
  // hidden until Submit, like lettered quizzes
  qa?.classList.add("eq-answer");
  const status = footer.createSpan({ cls: "eq-status" });
  const btn = footer.createEl("button", { cls: "eq-btn", text: "Submit Answer" });
  guard(btn, () => {
    const done = callout.classList.toggle("eq-done");
    if (done) {
      const { right, total } = grade();
      const all = right === total;
      status.setText(all ? "Correct!" : `Not quite: ${right} of ${total} right`);
      status.className = `eq-status ${all ? "is-right" : "is-wrong"}`;
    } else {
      clear();
      status.setText("");
      status.className = "eq-status";
    }
    btn.setText(done ? "Try again" : "Submit Answer");
    qa?.classList.toggle("eq-revealed", done);
    qa?.classList.toggle("is-open", done);
  });
  return btn;
}
