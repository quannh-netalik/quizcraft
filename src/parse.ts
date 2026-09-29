// Pure helpers for quiz markdown: no DOM, so they are easy to test.

/** An option line: `A) text` or `A. text`. */
export const LETTER_RE = /^\s*([A-Z])[).](\s|$)/;

/** The option letter a line starts with, if any. */
export function optionLetter(text: string): string | undefined {
  return LETTER_RE.exec(text)?.[1];
}

/** How one option ends up after Submit; `undefined` = not picked and not in the key. */
export type OptionMark = "correct" | "wrong" | "missed" | undefined;

export interface ChoiceGrade {
  /** every key letter picked and nothing else */
  right: boolean;
  marks: Map<string, OptionMark>;
}

/** Grade picked letters against the key. `letters` lists every option shown. */
export function grade(letters: readonly string[], picked: readonly string[], key: readonly string[]): ChoiceGrade {
  const marks = new Map<string, OptionMark>();
  for (const letter of letters) {
    const chosen = picked.includes(letter);
    const inKey = key.includes(letter);
    marks.set(letter, chosen ? (inKey ? "correct" : "wrong") : inKey ? "missed" : undefined);
  }
  const right = key.length > 0 && [...marks.values()].every((m) => m === "correct" || m === undefined);
  return { right, marks };
}
