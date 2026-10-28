# Changelog

All notable changes to Quizcraft. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [1.0.1] - 2026-10-28

### Fixed

- Quiz cards draw their own frame, title strip and option tiles. Before,
  they relied on a vault CSS snippet; without it options showed as bullets
  and the footer stuck out of the card.

## [1.0.0] - 2026-10-27

### Added

- `[!quiz|order]`: drag the steps into order with mouse, touch (from the grip)
  or the arrow keys. Each position is graded on submit.
- `[!quiz|match]`: pick a match for each left item from Obsidian's own menu.
  A choice is used once; picking a taken one swaps the two rows. The answer
  key shows as a two-column grid with hints.
- Settings tab with two toggles: *Shuffle quiz options* and *Remember code
  language*.
- Columns of match quizzes stack under 600px.
- Animations stop when the OS asks for reduced motion.

### Changed

- `styles.css` is now generated from one stylesheet per widget in `styles/`.
- Widget state is kept in `WeakMap`s instead of properties on Obsidian's DOM.

### Fixed

- A widget that fails on one callout no longer stops the rest of the note
  from rendering.
- An order quiz no longer leaves drag listeners behind when the drag is
  cancelled, the window loses focus, or the note re-renders mid-drag.
- Match quizzes keep **Submit Answer** disabled until every row has a pick,
  and name the row that holds a taken choice.

## [0.5.0] - 2026-10-16

### Added

- `[!code]`: dark code editor with language tabs and `[!file]` panes. The
  language picked last is remembered across editors.
- `[!tabs]`: flat content tabs, with an optional Lucide icon per tab.
- `[!carousel]`: image slides with counter, prev/next, restart, fullscreen,
  captions from alt text, and arrow-key navigation.
- `[!calc]`: a table becomes a small spreadsheet. Formulas in the callout
  metadata support `+ - * / ^`, parentheses, cell references, and `round`,
  `ceil` and `floor` with digits.
- `[!demo]`: runs a linked HTML file from the vault in a sandboxed frame.

### Fixed

- Calc reads numbers with thousands separators and trailing units.
- Calc formulas that refer to each other in a loop stop at the note's values.

## [0.2.0] - 2026-10-02

Rewrite: widgets are built from callouts instead of a `quizcraft` YAML code
block. The YAML format is removed.

### Added

- `[!quiz]` cards. Everything after a `==Answer==` line becomes a foldable
  answer section, with key lines shown as letter badges.
- Lettered options (`- A) text`) become a graded quiz: radios for one key
  line, checkboxes for several or for `*(Multi-select)*`. Submit marks
  correct, wrong and missed options and opens the answer.
- Options of a multiple-choice quiz are dealt in random order and relabelled
  A, B, C… The answer key is relabelled to match.
- **Try again** deals the options again.

### Changed

- Quizzes keep their markdown order when an option or the answer refers to
  another option by letter or position ("all of the above", "A and B").

### Fixed

- Grading uses the letter from the markdown, not the letter shown after
  shuffling.

## [0.1.1] - 2026-08-13

Last release of the YAML code-block format.

[1.0.1]: https://github.com/quannh-netalik/quizcraft/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/quannh-netalik/quizcraft/compare/0.5.0...1.0.0
[0.5.0]: https://github.com/quannh-netalik/quizcraft/compare/0.2.0...0.5.0
[0.2.0]: https://github.com/quannh-netalik/quizcraft/compare/0.1.1...0.2.0
[0.1.1]: https://github.com/quannh-netalik/quizcraft/releases/tag/0.1.1
