import { setIcon } from "obsidian";
import { decorateBody } from "./answer";
import type { Widget } from "./widgets";

export const QUIZ_SELECTOR = '.callout[data-callout="quiz"]';

/** A [!quiz] callout after setupCard: `eqQa` is its answer section, when the note has one. */
export interface QuizCallout extends HTMLElement {
  eqQa?: HTMLElement;
}

/** The `==Answer==` paragraph: a lone <mark> reading "Answer". */
export function findAnswerMarker(content: HTMLElement): HTMLElement | undefined {
  return [...content.children].find(
    (n): n is HTMLElement =>
      n.tagName === "P" &&
      n.children.length === 1 &&
      n.firstElementChild?.tagName === "MARK" &&
      /^answer$/i.test(n.textContent?.trim() ?? ""),
  );
}

/**
 * Every [!quiz] callout is a card. Everything after the `==Answer==` marker
 * moves into an answer section (div.eq-qa) at the bottom of the same card.
 */
export function setupCard(callout: QuizCallout): void {
  if (callout.dataset.eqCard) return;
  const content = callout.querySelector<HTMLElement>(":scope > .callout-content");
  if (!content) return;
  callout.dataset.eqCard = "1";
  callout.classList.add("eq-card");
  const marker = findAnswerMarker(content);
  if (!marker) return;
  const qa = createDiv({ cls: "eq-qa" });
  const head = qa.createDiv({ cls: "eq-qa-head" });
  setIcon(head.createSpan({ cls: "eq-qa-icon" }), "eye");
  // label text comes from CSS, so it can read "Show answer" / "Hide answer"
  head.createSpan({ cls: "eq-qa-label" });
  setIcon(head.createSpan({ cls: "eq-qa-fold" }), "chevron-right");
  const body = qa.createDiv({ cls: "eq-qa-body" });
  while (marker.nextSibling) body.appendChild(marker.nextSibling);
  marker.replaceWith(qa);
  decorateBody(body);
  callout.eqQa = qa;
  head.addEventListener("click", (e) => {
    e.preventDefault();
    qa.classList.toggle("is-open");
  });
}

export const quizCard: Widget = {
  name: "quiz-card",
  selector: QUIZ_SELECTOR,
  setup: (callout) => setupCard(callout),
};
