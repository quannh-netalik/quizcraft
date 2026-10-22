import { setIcon } from "obsidian";
import { guard, wrapChildren } from "../../lib/dom";
import type { QuizCallout } from "./card";
import type { Widget } from "../registry";

export const MATCH_SELECTOR = '.callout[data-callout="quiz"][data-callout-metadata="match"]';

/**
 * The right pick for each left item: the bold part of each answer bullet
 * (`- left → **right**`), in the order of the left list.
 */
export function matchKey(qa: HTMLElement | undefined): string[] {
  return [...(qa?.querySelectorAll(".eq-qa-body > ul > li") ?? [])].map(
    (li) => li.querySelector(":scope > strong")?.textContent?.trim() ?? "",
  );
}

/**
 * `> [!quiz|match]`: the first bullet list holds the left items, the second
 * the choices. The answer section pairs each left item with its choice.
 */
export function setupMatch(callout: QuizCallout): void {
  if (callout.dataset.eqMatch) return;
  const content = callout.querySelector<HTMLElement>(":scope > .callout-content");
  const [lefts, rights] = content ? [...content.querySelectorAll<HTMLElement>(":scope > ul")] : [];
  const key = matchKey(callout.eqQa);
  const rows = lefts ? [...lefts.children].filter((li): li is HTMLElement => li.tagName === "LI") : [];
  // every left item needs exactly one answer, or there is nothing to grade against
  if (!content || !lefts || !rights || rows.length < 2 || key.length !== rows.length || key.some((k) => !k)) return;
  callout.dataset.eqMatch = "1";
  callout.classList.add("eq-quiz", "eq-match");
  // the choices are offered in the pickers; the list itself is hidden
  rights.classList.add("eq-match-pool");
  // picked[i] is the choice row i holds, "" while empty
  const picked = rows.map(() => "");
  const picks = rows.map((li) => {
    li.classList.add("eq-match-row");
    wrapChildren(li, "eq-match-left");
    const slot = li.createDiv({ cls: "eq-match-slot" });
    const pick = slot.createEl("button", { cls: "eq-match-pick", attr: { type: "button", "aria-haspopup": "menu" } });
    pick.createSpan({ cls: "eq-match-val" });
    setIcon(pick.createSpan({ cls: "eq-match-chev" }), "chevron-down");
    guard(pick, () => {
      // the choice menu opens here
    });
    return pick;
  });
  const paint = () => {
    for (const [i, pick] of picks.entries()) {
      pick.querySelector(".eq-match-val")?.setText(picked[i] || "Select a match");
      pick.classList.toggle("is-empty", !picked[i]);
    }
  };
  paint();
}

export const matchQuiz: Widget = {
  name: "match-quiz",
  selector: MATCH_SELECTOR,
  setup: (callout) => setupMatch(callout),
};
