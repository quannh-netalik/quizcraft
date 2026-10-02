// Pure helpers for quiz markdown: no DOM, so they are easy to test.

/** An option line: `A) text` or `A. text`. */
export const LETTER_RE = /^\s*([A-Z])[).](\s|$)/;

/** The option letter a line starts with, if any. */
export function optionLetter(text: string): string | undefined {
  return LETTER_RE.exec(text)?.[1];
}

/**
 * Options that point at other options by place ("all of the above", "both",
 * "A and B"). Shuffling such a quiz would break the reference, so it keeps its order.
 */
export const POSITIONAL_RE =
  /\b(all|none|any) of (the )?(above|these|them)\b|\bboth\b|\bneither\b|\babove\b|\bbelow\b|\b[A-H] (and|&|or) [A-H]\b/i;

/** Answer text that cites an option by letter: "option C", "(B)", "A and B". */
export const CITED_RE = /\b([Oo]ption|[Aa]nswer|[Cc]hoice)s? [A-H]\b|\(\s*[A-H]\s*\)|\b[A-H] (and|&|or) [A-H]\b/;

/**
 * True when the options may be dealt in a new order: no option points at
 * another by place, and the answer prose does not cite one by letter (only the
 * bold key letters are relabelled, not letters inside sentences).
 */
export function canShuffle(optionTexts: readonly string[], answerText = ""): boolean {
  return !POSITIONAL_RE.test(optionTexts.join("\n")) && !CITED_RE.test(answerText);
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
