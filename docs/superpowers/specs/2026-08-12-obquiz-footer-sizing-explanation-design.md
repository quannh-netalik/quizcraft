# Obquiz Footer Sizing and Explanation Design

## Objective

Balance the footer controls and visually separate explanations from correct-answer feedback without adding a tinted panel background.

## Footer Controls

- Give `↻`, `<`, `>`, and `Check` identical `3.75rem × 2.75rem` button boxes.
- Increase the visible symbol size for `↻`, `<`, and `>`.
- Keep `Check` at the normal small UI font size so the label fits comfortably.
- Preserve the existing footer positions, disabled states, accessible labels, and behavior.
- Apply the same dimensions at narrow viewport widths instead of shrinking only `Check`.

## Explanation Section

- Use `var(--background-primary)` so the section follows the active Obsidian theme.
- Replace the green-tinted border with a softened interactive-accent border.
- Render a real `.obquiz-explanation-label` element containing `Explanation`
  before the Markdown explanation content.
- Style the label as small, bold UI text with spacing below it; do not use a
  pseudo-element or heading semantics.
- Preserve the existing text color, spacing, line height, radius, and rendering behavior.
- Keep correct-answer option backgrounds and borders unchanged.

## Implementation Boundary

- Update explanation markup in `src/quiz-controller.ts` and its selectors in
  `styles.css`; retain the already approved footer-control styling.
- Add focused CSS contract assertions in `tests/package.test.cjs`.
- Rebuild `main.js` and copy `main.js`, `manifest.json`, and `styles.css` to `.obsidian/plugins/obquiz` after verification.
- Do not change controller logic, quiz state, schemas, renderers, or scoring.

## Verification

- Run the focused CSS contract test through `npm test`.
- Run the complete `npm test` suite.
- Run `npm run build`.
- Confirm the installed release artifacts match the source release artifacts byte-for-byte.
