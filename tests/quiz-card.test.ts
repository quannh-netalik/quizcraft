import { describe, expect, test } from "bun:test";
import { findAnswerMarker, setupCard, type QuizCallout } from "../src/quiz";
import { callout, click, content } from "./helpers";

const QUESTION = `<p>Which one?</p><ul><li>A) one</li><li>B) two</li></ul>`;

describe("findAnswerMarker", () => {
  test("finds a paragraph holding only ==Answer==", () => {
    const box = callout("quiz", `${QUESTION}<p><mark>Answer</mark></p><p><strong>B)</strong> two</p>`);
    expect(findAnswerMarker(content(box))?.textContent).toBe("Answer");
  });

  test("is case-insensitive and ignores surrounding space", () => {
    const box = callout("quiz", `<p> <mark>ANSWER</mark> </p>`);
    expect(findAnswerMarker(content(box))).toBeDefined();
  });

  test("ignores highlighted text inside a sentence", () => {
    const box = callout("quiz", `<p>The <mark>Answer</mark> is below</p>`);
    expect(findAnswerMarker(content(box))).toBeUndefined();
  });

  test("ignores other highlighted words", () => {
    const box = callout("quiz", `<p><mark>Solution</mark></p>`);
    expect(findAnswerMarker(content(box))).toBeUndefined();
  });
});

describe("setupCard", () => {
  test("moves everything after the marker into the answer section", () => {
    const box = callout("quiz", `${QUESTION}<p><mark>Answer</mark></p><p><strong>B)</strong> two</p><p>Because.</p>`);
    setupCard(box);
    const qa = (box as QuizCallout).eqQa!;
    expect(box.classList.contains("eq-card")).toBe(true);
    expect(qa.parentElement).toBe(content(box));
    expect(qa.querySelector(".eq-qa-body")!.children).toHaveLength(2);
    expect(content(box).querySelector("mark")).toBeNull();
  });

  test("a card without a marker gets no answer section", () => {
    const box = callout("quiz", QUESTION);
    setupCard(box);
    expect(box.classList.contains("eq-card")).toBe(true);
    expect((box as QuizCallout).eqQa).toBeUndefined();
  });

  test("clicking the head toggles the answer open", () => {
    const box = callout("quiz", `${QUESTION}<p><mark>Answer</mark></p><p>B</p>`);
    setupCard(box);
    const qa = (box as QuizCallout).eqQa!;
    click(qa.querySelector(".eq-qa-head")!);
    expect(qa.classList.contains("is-open")).toBe(true);
    click(qa.querySelector(".eq-qa-head")!);
    expect(qa.classList.contains("is-open")).toBe(false);
  });
});
