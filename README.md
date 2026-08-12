# Obquiz

Obquiz renders interactive quizzes from `obquiz` YAML code blocks. One
format supports single-choice, multiple-choice, matching, and ordering
questions, either alone or in a paginated set.

## Installation

Build the plugin, then copy these files into
`<vault>/.obsidian/plugins/obquiz/`:

- `main.js`
- `manifest.json`
- `styles.css`

Reload Obsidian, then enable **Obquiz** under **Settings → Community
plugins**.

## Quick start

Add an `obquiz` fenced code block to a note:

````markdown
```obquiz
title: HTTP basics
questions:
  - type: single
    question: Which method is idempotent?
    options:
      - POST
      - PUT
      - PATCH
    answers: [2]
    explanation: PUT produces the same resulting state when repeated.
```
````

The top-level YAML value must contain a non-empty `questions` list. `title` is
optional; omit it to render the quiz without a heading.

## Quiz format

### Top-level options

| Option | Required | Description |
| --- | --- | --- |
| `title` | No | Non-empty text displayed above the quiz. |
| `questions` | Yes | One or more question mappings. |

Every question requires:

| Option | Required | Description |
| --- | --- | --- |
| `type` | Yes | `single`, `multiple`, `matching`, or `ordering`. |
| `question` | Yes | Non-empty prompt text. Markdown is supported. |
| `explanation` | No | Markdown shown after the answer is checked. |

Question prompts, choices, matching cards, ordering items, and explanations are
rendered as Markdown. Quote YAML text when punctuation could otherwise be
interpreted as YAML syntax.

### Single choice

Use `single` when exactly one option is correct:

```yaml
- type: single
  question: Which status code means **Not Found**?
  options: [200, 404, 500]
  answers: [2]
```

- `options` must contain at least two non-empty strings.
- `answers` must contain exactly one one-based option position.

### Multiple choice

Use `multiple` when one or more options are correct:

```yaml
- type: multiple
  question: Which methods are safe?
  options: [GET, POST, HEAD, DELETE]
  answers: [1, 3]
```

- `options` must contain at least two non-empty strings.
- `answers` must contain one or more unique, one-based option positions.
- The response is correct only when every correct option, and no incorrect
  option, is selected.

`answers` always refers to the authored `options` order. The plugin may display
the options in a different order.

### Matching

Use `matching` with at least two `[left, right]` pairs:

```yaml
- type: matching
  question: Match each method to its behavior.
  pairs:
    - [GET, Reads a resource]
    - [POST, Creates or submits data]
    - [DELETE, Removes a resource]
```

Each pair must contain exactly two non-empty strings. The pair order defines the
correct connections. Both columns are shuffled independently when the question
is first rendered and when it is reset.

Select one card from each column to connect them. Selecting a connected card
disconnects it so it can be reassigned. Each card can participate in only one
connection. Card text remains selectable without creating a connection.

### Ordering

Use `ordering` with the items authored in their correct order:

```yaml
- type: ordering
  question: Put the request lifecycle in order.
  items:
    - Receive request
    - Validate input
    - Process request
    - Return response
```

`items` must contain at least two non-empty strings. The plugin shuffles their
initial display order; drag the items to arrange them before checking.

### Explanations

`explanation` is optional for every question type. It appears only after the
current answer is checked. Use YAML block syntax for multiline Markdown:

```yaml
explanation: |
  The first paragraph can contain **Markdown**.

  Blank lines separate additional paragraphs.
```

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
answer. Every matching entry contains exactly two strings; both matching
columns are shuffled independently when rendered and reset. Matching-card text
remains selectable without triggering a connection.

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

## Validation errors

Invalid YAML or unsupported quiz data is replaced with an `Obquiz:` error in
the note. Common causes include an unsupported `type`, fewer than two choices,
zero-based answer positions, duplicate answers, or malformed matching pairs.

## Development

```sh
npm install
npm run dev
```

`npm run dev` watches source files and rebuilds `main.js`. Run the complete
checks before distributing a build:

```sh
npm test
npm run build
```

### Source structure

- `src/main.ts` registers the plugin and owns the Markdown processor boundary.
- `src/model.ts` validates YAML and contains pure answer logic.
- `src/quiz-controller.ts` coordinates navigation and quiz lifecycle.
- `src/quiz-state.ts` contains pure question-state transitions and evaluation.
- `src/renderers/` contains interaction-specific DOM rendering.
- `src/config.ts` contains shared plugin identity and display labels.
