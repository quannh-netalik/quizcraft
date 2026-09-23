import type { Widget } from "./widgets";

export const QUIZ_SELECTOR = '.callout[data-callout="quiz"]';

/** Every [!quiz] callout is a card; the quiz widgets build on top of it. */
export function setupCard(callout: HTMLElement): void {
  if (callout.dataset.eqCard) return;
  const content = callout.querySelector<HTMLElement>(":scope > .callout-content");
  if (!content) return;
  callout.dataset.eqCard = "1";
  callout.classList.add("eq-card");
}

export const quizCard: Widget = {
  name: "quiz-card",
  selector: QUIZ_SELECTOR,
  setup: (callout) => setupCard(callout),
};
