# Quizcraft agent guide

## Purpose

Quizcraft is a publishable Obsidian community plugin. It renders one paginated,
interactive quiz from each `quizcraft` YAML code block.

## Boundaries

- Keep the plugin ID `quizcraft`, display name `Quizcraft`, and fence language
  `quizcraft` synchronized across package metadata, manifest, source, and README.
- Preserve the four question types: `single`, `multiple`, `matching`, and
  `ordering`.
- Keep schema and answer logic pure in `src/model.ts`.
- Keep plugin registration in `src/main.ts`, quiz coordination in
  `src/quiz-controller.ts`, and interaction-specific DOM code in
  `src/renderers/`.
- Keep shared plugin identity and display labels in `src/config.ts`; leave
  renderer-specific constants with their owning renderer.
- Add no runtime dependency without a concrete requirement.
- Scope every style under `.quizcraft` or `.quizcraft-error`.
- Maintain mouse, touch, and keyboard access.

## Authoring contract

- Treat the `quizcraft` YAML format documented in `README.md` as the public API.
- Keep `title` and `explanation` optional. Require at least one question.
- Keep question prompts and all answer content as non-empty strings rendered
  through Obsidian's Markdown renderer.
- Keep `answers` one-based in authored YAML and convert to zero-based positions
  only inside implementation logic.
- Require exactly one answer for `single`; allow one or more unique answers for
  `multiple`.
- Require at least two options, matching pairs, or ordering items.
- Preserve matching pairs as `[prompt, match]`; their authored pair index defines
  the correct connection.
- Preserve authored ordering-item order as the correct answer.
- Reject malformed input with a path-specific `QuizValidationError` rather than
  partially rendering it.

## State and rendering

- Keep answer evaluation and state transitions independent from DOM rendering.
- Do not mutate authored question data while shuffling or answering.
- Give each quiz instance distinct radio-group names so multiple quizzes can
  coexist in one note.
- Preserve question state when navigating backward. Reset only the current
  question unless the user selects **Try Again** on the completion screen.
- For matching questions, shuffle the two columns independently and maintain a
  one-to-one connection mapping.
- Update choice and matching interactions in place where possible. If a
  renderer schedules frames or observers, return cleanup that cancels or
  disconnects them before rerendering.
- Measure matching paths from the visible connection ports and keep arrowheads
  aligned with the terminal path direction.
- Allow users to select answer text without accidentally activating a card.

## UI conventions

- Keep the footer layout as reset on the left, navigation and progress in the
  center, and **Check** on the right.
- Keep reset, previous, next, and check controls the same button size. Use
  accessible labels for icon-only controls.
- Keep the current page number bold and disable navigation according to the
  current question lifecycle.
- Use theme variables for colors and surfaces. Do not hard-code a grey
  explanation background; distinguish explanations from correct answers with a
  labeled, theme-background section and its own border color.
- Maintain visible focus states and responsive behavior in narrow panes.

## Change workflow

- Inspect the relevant source, tests, and existing diff before editing.
- Make the smallest contained change and preserve unrelated working-tree files.
- Add or update focused tests for schema, state, renderer, style, or package
  contracts affected by the change.
- Do not commit, copy release artifacts, or modify the installed plugin unless
  explicitly requested.

## Required checks

Run these from this folder after every behavior change:

```sh
npm test
npm run build
```

Also run `git diff --check` before committing.

Release artifacts are exactly `main.js`, `manifest.json`, and `styles.css`.
`styles.css` is generated from `styles/*.css` (order in `scripts/styles.ts`):
edit the parts, then run `bun run dev` or `bun run build`.
Source code, tests, README, and package metadata remain in the repository but
are not copied into an installed vault plugin folder. When installation is
requested, copy the three artifacts to `../.obsidian/plugins/quizcraft/` and verify
each installed file is byte-identical to its repository source. Report build,
artifact equality, and in-app Obsidian verification as separate evidence.
