# Quizcraft

Quizcraft turns plain Obsidian callouts into interactive widgets. Notes stay
ordinary Markdown: without the plugin they still read as a question followed by
its answer, and the plugin never writes to a note.

> **Status:** rewrite in progress. The YAML code-block format of 0.1.x has been
> removed; the callout format below replaces it.

## Markdown contract

Each widget is a callout. The callout type picks the widget; the callout
metadata (`[!type|meta]`) carries widget options.

| Callout | Widget |
| --- | --- |
| `[!quiz]` | Multiple-choice question graded on submit |
| `[!quiz\|order]` | Put the steps in the right order |
| `[!quiz\|match]` | Match each item on the left to one on the right |
| `[!code]` | Code editor with language tabs and file panes |
| `[!tabs]` | Content tabs |
| `[!carousel]` | Image slides, one at a time |
| `[!calc\|formulas]` | Spreadsheet table with live formulas |
| `[!demo\|height]` | HTML file run in a sandboxed frame |

Rules shared by every widget:

- The plugin reads the rendered callout and never edits the source note.
- A callout the plugin cannot parse is left exactly as Obsidian rendered it.
- Answers live in the note itself, after a `==Answer==` marker line.

## Quiz cards

A `[!quiz]` callout is a question card. A line holding only `==Answer==`
starts the answer: everything after it moves into a collapsible
**Show answer** section at the bottom of the card.

```markdown
> [!quiz] Question 1
> Which planet is closest to the Sun?
> - A) Venus
> - B) Mercury
> - C) Mars
>
> ==Answer==
>
> **B)** Mercury
> Mercury orbits at about 0.39 AU.
>
> **Why not the others**
> - Venus is second, Mars is fourth.
```

- A line starting with a bold letter (`**B)**` or `**B.**`) is a key line and
  shows the letter as a badge. Write one key line per correct option.
- A line holding only `**Why not the others**` starts a muted sub-section; the
  list after it belongs to it.
- Without an `==Answer==` line, or with nothing after it, the card has no
  answer section.

## Development

Requires [Bun](https://bun.sh) 1.4 or later.

```sh
bun install
bun run dev      # unminified build to main.js
bun run check    # typecheck, lint, test
bun run build    # production build
```

## License

MIT
