# Obquiz Footer Controls Design

## Objective

Replace the split question-header actions and pager with one stable footer:

`[↻]    [<  **current**/total  >]    [Check]`

## Behavior

- Move the per-question reset control from the question header to the footer's left edge.
- Display reset as `↻` only, while retaining the accessible label `Reset this question`.
- Display navigation as `<` and `>` only, with accessible previous/next labels.
- Display the current page number in bold, followed by `/total` in regular weight.
- Rename `Check Answer` to `Check` and place it at the footer's right edge.
- Keep `Check` visible after evaluation but disabled so the footer layout does not shift.
- Preserve navigation rules: `<` is disabled on the first question; `>` is disabled until the current question is checked; on the final checked question, `>` opens the completion screen.
- Preserve per-question reset behavior, retained state, scoring, and completion behavior.

## Implementation Boundary

- Update footer DOM construction in `src/quiz-controller.ts`.
- Update footer-specific styles in `styles.css`, including the narrow layout.
- Update affected interaction documentation and add focused DOM/package assertions where appropriate.
- Do not change quiz schemas, renderers, scoring, or question-state logic.

## Verification

- Run `npm test`.
- Run `npm run build`.
- Reload the plugin and inspect the footer in Obsidian when a running Obsidian instance is available.
