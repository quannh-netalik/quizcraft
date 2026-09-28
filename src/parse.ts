// Pure helpers for quiz markdown: no DOM, so they are easy to test.

/** An option line: `A) text`. */
export const LETTER_RE = /^\s*([A-Z])\)(\s|$)/;

/** The option letter a line starts with, if any. */
export function optionLetter(text: string): string | undefined {
  return LETTER_RE.exec(text)?.[1];
}
