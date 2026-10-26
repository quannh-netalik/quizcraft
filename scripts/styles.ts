// styles.css is built from styles/*.css, one file per widget. Obsidian loads a
// single styles.css, so the order here is the cascade order.
import { readFileSync } from "node:fs";

export const STYLE_PARTS = [
  "quiz-card",
  "quiz-choice",
  "tabs",
  "code",
  "carousel",
  "calc",
  "demo",
  "quiz-order",
  "quiz-match",
  // last, so its overrides win
  "motion",
] as const;

const BANNER = `/* Quizcraft — interactive widgets built from callouts.
   Card layout (border, radius, title strip) is left to the theme or a CSS snippet;
   these rules add the states and parts the plugin creates.
   Generated from styles/*.css by build.ts; edit those files, not this one. */
`;

/** The full styles.css text, from the parts in `dir`. */
export function buildStyles(dir = "styles"): string {
  const parts = STYLE_PARTS.map((name) => readFileSync(`${dir}/${name}.css`, "utf8").trim());
  return `${BANNER}\n${parts.join("\n\n")}\n`;
}
