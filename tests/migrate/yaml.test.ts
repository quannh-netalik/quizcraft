import { expect, test } from "bun:test";
import { parseYaml } from "obsidian";
import { ConvertError, convertNote, convertQuiz, hasYamlQuiz } from "../../src/migrate/yaml";

const convert = (yaml: string): string => convertQuiz(yaml, parseYaml);

test("a single question becomes a lettered quiz with one key line", () => {
  expect(
    convert(`title: HTTP basics
questions:
  - type: single
    question: Which method is idempotent?
    options: [POST, PUT, PATCH]
    answers: [2]
    explanation: PUT produces the same resulting state when repeated.`),
  ).toBe(`> [!quiz] HTTP basics
> Which method is idempotent?
> - A) POST
> - B) PUT
> - C) PATCH
>
> ==Answer==
>
> **B)** PUT
>
> PUT produces the same resulting state when repeated.`);
});

test("a multiple question gets one key line per answer, a blank line apart", () => {
  const out = convert(`questions:
  - type: multiple
    question: Which methods are safe?
    options: [GET, POST, HEAD, DELETE]
    answers: [1, 3]`);
  expect(out).toContain("> **A)** GET\n>\n> **C)** HEAD");
  expect(out).not.toContain("Multi-select");
});

test("a multiple question with one answer keeps checkboxes through the hint", () => {
  const out = convert(`questions:
  - type: multiple
    question: Which are safe?
    options: [GET, POST]
    answers: [1]`);
  expect(out).toContain("> Which are safe?\n> *(Multi-select)*\n> - A) GET");
});

test("ordering lists the steps out of order and keys them as a numbered list", () => {
  const out = convert(`questions:
  - type: ordering
    question: Put it in order.
    items: [Receive, Validate, Process]`);
  expect(out).toStartWith("> [!quiz|order] Question 1");
  expect(out).toContain("> - Process\n> - Validate\n> - Receive");
  expect(out).toContain("> 1. Receive\n> 2. Validate\n> 3. Process");
});

test("matching labels both columns and bolds each answer", () => {
  const out = convert(`questions:
  - type: matching
    question: Match them.
    pairs:
      - [SSH, "22"]
      - [HTTP, "80"]`);
  expect(out).toContain("> **Item**\n> - SSH\n> - HTTP\n>\n> **Match**\n> - 22\n> - 80");
  expect(out).toContain("> - SSH → **22**\n> - HTTP → **80**");
});

test("a set keeps its title above numbered question callouts", () => {
  const out = convert(`title: Set
questions:
  - {type: single, question: One?, options: [a, b], answers: [1]}
  - {type: single, question: Two?, options: [a, b], answers: [2]}`);
  expect(out).toStartWith("**Set**\n\n> [!quiz] Question 1\n");
  expect(out).toContain("\n\n> [!quiz] Question 2\n");
});

test("multiline markdown keeps its lines and blank lines inside the callout", () => {
  const out = convert(`questions:
  - type: single
    question: Pick one.
    options: [a, b]
    answers: [1]
    explanation: |
      First **paragraph**.

      Second.`);
  expect(out).toEndWith("> **A)** a\n>\n> First **paragraph**.\n>\n> Second.");
});

test.each([
  ["not a mapping", "- a"],
  ["no questions", "title: x"],
  ["unknown type", "questions: [{type: essay, question: q}]"],
  ["answer out of range", "questions: [{type: single, question: q, options: [a, b], answers: [3]}]"],
  ["two answers on single", "questions: [{type: single, question: q, options: [a, b], answers: [1, 2]}]"],
  ["one option", "questions: [{type: single, question: q, options: [a], answers: [1]}]"],
  ["bad pair", "questions: [{type: matching, question: q, pairs: [[a], [b, c]]}]"],
  ["repeated choices", "questions: [{type: matching, question: q, pairs: [[a, x], [b, x]]}]"],
  ["repeated steps", "questions: [{type: ordering, question: q, items: [a, a]}]"],
  ["invalid yaml", "questions: [unclosed"],
])("%s is refused", (_name, yaml) => {
  expect(() => convert(yaml)).toThrow(ConvertError);
});

test("convertNote replaces each block and leaves failed blocks as they were", () => {
  const good = "```quizcraft\nquestions:\n  - {type: single, question: Q?, options: [a, b], answers: [1]}\n```";
  const bad = "~~~quizcraft\nquestions: []\n~~~";
  const note = `# Note\n\n${good}\n\ntext\n\n${bad}\n`;
  const result = convertNote(note, parseYaml);
  expect(result.converted).toBe(1);
  expect(result.failed).toEqual(["questions needs at least 1 items"]);
  expect(result.text).toStartWith("# Note\n\n> [!quiz] Question 1\n> Q?\n");
  expect(result.text).toContain(`text\n\n${bad}\n`);
  expect(hasYamlQuiz(result.text)).toBe(true);
});

test("convertNote keeps a list indent and ignores other code blocks", () => {
  const note = "- item\n\n  ```quizcraft\n  questions:\n    - {type: single, question: Q?, options: [a, b], answers: [2]}\n  ```\n\n```yaml\nquizcraft: 1\n```";
  const result = convertNote(note, parseYaml);
  expect(result.text).toContain("\n  > [!quiz] Question 1\n  > Q?\n");
  expect(result.text).toEndWith("```yaml\nquizcraft: 1\n```");
});

test("an unclosed block is reported and the note is left alone", () => {
  const note = "a\n```quizcraft\nquestions: []";
  expect(convertNote(note, parseYaml)).toEqual({ text: note, converted: 0, failed: ["a quizcraft block has no closing fence"] });
});
