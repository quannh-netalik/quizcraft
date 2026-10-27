# Quizcraft agent guide

## Purpose

Quizcraft is a publishable Obsidian community plugin. It turns callouts
(`> [!quiz]`, `> [!code]`, `> [!carousel]`, `> [!calc]`, `> [!demo]`,
`> [!tabs]`) into interactive widgets in Reading view and Live Preview.

## Boundaries

- Keep the plugin ID `quizcraft` and display name `Quizcraft` synchronized
  across package.json, manifest.json, source, and README.
- Never write to a note. Widgets read the rendered callout DOM only.
- A callout a widget cannot parse stays exactly as Obsidian rendered it.
- Keep `src/main.ts` thin: settings, setting tab, one markdown post-processor.
- Each widget lives in `src/widgets/<area>/`, exports a `Widget`, and is listed
  in `WIDGETS` in `src/widgets/registry.ts`. Order in that list matters: the
  quiz card runs before the choice, order, and match widgets.
- Shared helpers go in `src/lib/` only when two widgets use them.
- Add no runtime dependency without a concrete requirement.
- Keep markdown syntax and the `.eq-*` class names stable: vault CSS snippets
  depend on them.
- Maintain mouse, touch, and keyboard access.

## Authoring contract

- The callout syntax documented in `README.md` is the public API.
- Answers live in the note, after a `==Answer==` marker paragraph. Without the
  plugin a note must still read as question followed by answer.
- Lettered options (`- A) text`, `- A. text`) keep their markdown letter in
  `data-eq-letter`; grading always uses that letter, even after shuffling.
- Options that cite each other ("all of the above", "A and B") never shuffle.

## State and rendering

- `setup` must be idempotent: Obsidian re-runs post-processors on the same
  element. Mark a set-up callout with a `data-eq-*` attribute and return early.
- Keep per-element state in module-level `WeakMap`s, not expandos.
- Listeners on `document` or `window` must be removable with one
  `AbortController`, and must stop when their element leaves the DOM.
- Keep grading and parsing pure (`grade`, `gradeOrder`, `gradeMatch`,
  `canShuffle`, the calc formula parser) and test them without the DOM.
- One widget throwing must not stop the others; `renderWidgets` logs and
  continues.
- Stop click and mousedown on controls (`guard` in `src/lib/dom.ts`), or Live
  Preview moves the cursor into the callout source.

## Styles

- `styles.css` is generated. Edit `styles/*.css`; the join order is in
  `scripts/styles.ts`. CI fails when the committed file is stale.
- Use theme variables for colors and surfaces; both light and dark themes must
  read well.
- Honor `prefers-reduced-motion` (`styles/motion.css`).

## Change workflow

- Inspect the relevant source, tests, and existing diff before editing.
- Make the smallest contained change and preserve unrelated working-tree files.
- Add or update focused tests under `tests/<area>/` for every behavior change.
  Obsidian APIs come from `tests/stubs/obsidian.ts`; extend the stub rather
  than mocking per test.
- Do not commit, copy release artifacts, or modify an installed plugin unless
  explicitly requested.

## Required checks

Run these after every behavior change:

```sh
bun run check
bun run build
```

Also run `git diff --check` before committing.

Release artifacts are exactly `main.js`, `manifest.json`, and `styles.css`.
`styles.css` is generated from `styles/*.css` (order in `scripts/styles.ts`):
edit the parts, then run `bun run dev` or `bun run build`.
Source code, tests, README, and package metadata remain in the repository but
are not copied into an installed vault plugin folder. When installation is
requested, copy the three artifacts to `<vault>/.obsidian/plugins/quizcraft/`
and verify each installed file is byte-identical to its repository source.
Report build, artifact equality, and in-app Obsidian verification as separate
evidence.
