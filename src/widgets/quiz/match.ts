import { Menu, setIcon } from "obsidian";
import { guard, wrapChildren } from "../../lib/dom";
import { sameOrder, shuffled } from "../../lib/shuffle";
import type { QuizCallout } from "./card";
import { gradedFooter } from "./footer";
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
 * Give row `i` the choice `c`. A choice is used once: when another row holds
 * `c`, that row takes row i's old pick instead (a swap).
 */
export function choose(picked: readonly string[], i: number, c: string): string[] {
  const next = [...picked];
  const holder = next.indexOf(c);
  if (holder !== -1 && holder !== i) next[holder] = next[i] ?? "";
  next[i] = c;
  return next;
}

/** For each row, whether its pick is the key's choice. */
export function gradeMatch(picked: readonly string[], key: readonly string[]): boolean[] {
  return key.map((k, i) => picked[i] === k);
}

/** Text of each list item, trimmed. */
const itemTexts = (items: readonly Element[]): string[] => items.map((li) => li.textContent?.trim() ?? "");

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
  const pool = itemTexts([...rights.children]);
  // menu order is random, dealt again on Try again
  let choices = shuffled(pool);
  rights.classList.add("eq-match-pool");
  // rows are dealt in random order too, never the markdown order; row i stays
  // tied to key[i] whatever its place on screen
  const dealRows = () => {
    for (const li of shuffled(rows, sameOrder(rows))) lefts.appendChild(li);
  };
  // picked[i] is the choice row i holds, "" while empty
  let picked = rows.map(() => "");
  const picks = rows.map((li, i) => {
    li.classList.add("eq-match-row");
    wrapChildren(li, "eq-match-left");
    const slot = li.createDiv({ cls: "eq-match-slot" });
    const pick = slot.createEl("button", { cls: "eq-match-pick", attr: { type: "button", "aria-haspopup": "menu" } });
    pick.createSpan({ cls: "eq-match-val" });
    setIcon(pick.createSpan({ cls: "eq-match-chev" }), "chevron-down");
    // Obsidian's own menu: themed, keyboard friendly, a bottom sheet on mobile
    guard(pick, () => {
      if (callout.classList.contains("eq-done")) return;
      const menu = new Menu();
      for (const c of choices) {
        menu.addItem((item) =>
          item
            .setTitle(c)
            .setChecked(picked[i] === c)
            .onClick(() => {
              picked = choose(picked, i, c);
              paint();
            }),
        );
      }
      // `dom` is not in the typings, but every desktop and mobile build has it
      (menu as Menu & { dom?: HTMLElement }).dom?.addClass("eq-match-menu");
      const r = pick.getBoundingClientRect();
      menu.showAtPosition({ x: r.left, y: r.bottom + 4, width: r.width });
    });
    return { slot, pick };
  });
  const paint = () => {
    for (const [i, { pick }] of picks.entries()) {
      pick.querySelector(".eq-match-val")?.setText(picked[i] || "Select a match");
      pick.classList.toggle("is-empty", !picked[i]);
    }
  };
  // graded: the picker gives way to the pick, with the right choice under a wrong one
  gradedFooter(
    callout,
    content,
    () => {
      const marks = gradeMatch(picked, key);
      for (const [i, { slot }] of picks.entries()) {
        const ok = marks[i] ?? false;
        rows[i]?.classList.add(ok ? "eq-correct" : "eq-wrong");
        const res = slot.createDiv({ cls: "eq-match-result" });
        res.createDiv({ cls: "eq-match-yours", text: picked[i] || "\u2014" });
        if (!ok) res.createDiv({ cls: "eq-match-fix", text: key[i] ?? "" });
      }
      return { right: marks.filter(Boolean).length, total: key.length };
    },
    () => {
      picked = rows.map(() => "");
      choices = shuffled(pool);
      dealRows();
      for (const [i, { slot }] of picks.entries()) {
        rows[i]?.classList.remove("eq-correct", "eq-wrong");
        slot.querySelector(":scope > .eq-match-result")?.remove();
      }
      paint();
    },
  );
  dealRows();
  paint();
}

export const matchQuiz: Widget = {
  name: "match-quiz",
  selector: MATCH_SELECTOR,
  setup: (callout) => setupMatch(callout),
};
