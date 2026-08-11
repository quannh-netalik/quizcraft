# Obsidian Quiz

Obsidian Quiz renders interactive quizzes from `obquiz` YAML code blocks. One
format supports single-choice, multiple-choice, matching, and ordering
questions, either alone or in a paginated set.

## Development

```sh
npm install
npm run dev
```

Run `npm test` for model and package-contract tests, and `npm run build` for a
production bundle. To install manually, copy `main.js`, `manifest.json`, and
`styles.css` into `<vault>/.obsidian/plugins/obquiz/`.

### Source structure

- `src/main.ts` registers the plugin and owns the Markdown processor boundary.
- `src/quiz-controller.ts` coordinates navigation and quiz lifecycle.
- `src/quiz-state.ts` contains pure question-state transitions and evaluation.
- `src/renderers/` contains interaction-specific DOM rendering.
- `src/config.ts` contains shared plugin identity and display labels.

## Complete example

````markdown
```obquiz
title: HTTP and architecture fundamentals
questions:
  - type: single
    question: Which HTTP method is idempotent?
    options: [POST, PUT, PATCH, CONNECT]
    answers: [2]
    explanation: |
      `PUT` is idempotent because repeating the same request leaves the
      resource in the same resulting state.

  - type: multiple
    question: Which HTTP methods are safe?
    options: [GET, POST, HEAD, DELETE]
    answers: [1, 3]
    explanation: |
      `GET` and `HEAD` are safe because they are intended only to retrieve
      information.

  - type: matching
    question: Match each concept with its description.
    pairs:
      - [
          "Repository port",
          "A boundary defining how domain code accesses stored data."
        ]
      - [
          "Value object",
          "An object defined by its attributes rather than an identity."
        ]
      - [
          "Domain event",
          "A record describing something that happened in the domain."
        ]
      - [
          "Application service",
          "A component coordinating a use case without owning business rules."
        ]
    explanation: |
      Each description names the primary responsibility of its matching
      architectural concept.

  - type: ordering
    question: Put the request lifecycle in the correct order.
    items:
      - Receive request
      - Validate input
      - Process request
      - Return response
    explanation: |
      Validation happens before processing, and a response is returned only
      after processing finishes.
```
````

`answers` uses one-based option positions. The order of `items` is the correct
answer. Every matching entry contains exactly two strings; second-column cards
are shuffled when rendered.

## Interaction

- Only one question is visible at a time.
- The footer shows **↻** on the left, **< current/total >** in the center, and
  **Check** on the right. The current question number is bold.
- **<** is disabled only on the first question.
- **Check** remains disabled until the current response is complete. For
  matching questions, every card must be connected.
- **Check** remains visible but disabled after it evaluates the current answer.
- **>** remains disabled until **Check** evaluates the current answer. On the
  final checked question, **>** opens a scored completion screen.
- **↻** is always available at the bottom left. It clears selections,
  connections, ordering changes, and evaluation for only that question, restoring
  the initially displayed order.
- The completion screen reports correct answers and percentage. Its **Try
  Again** button resets the entire quiz.
- Question state is retained when navigating backward.
- Explanations are optional multiline Markdown for every question type and
  appear after evaluation in a labeled **Explanation** section.

Choice, matching, and ordering items show their evaluated state directly. The
plugin does not add a separate result sentence.

Selected options use an accent border before evaluation without adding a fill.
After checking, choice borders and backgrounds change to soft green or red
feedback.

Matching cards always show small hollow connection ports centered on the facing
card borders. The port color follows the card border. Curved SVG paths are
measured from the rendered port centers, point from left to right with compact
arrowheads, and recalculate when the layout resizes.

For multiline explanations, use one YAML block marker and blank lines between
paragraphs:

```yaml
explanation: |
  First paragraph with **Markdown**.

  Second paragraph.
```
