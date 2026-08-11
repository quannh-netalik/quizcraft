const test = require("node:test");
const assert = require("node:assert/strict");

const model = require("../.test-dist/model.cjs");

const questions = [
  { type: "single", question: "Pick one", options: ["A", "B"], answers: [2], explanation: "One.\n\nTwo." },
  { type: "multiple", question: "Pick many", options: ["A", "B", "C"], answers: [1, 3] },
  { type: "matching", question: "Match", pairs: [["A", "1"], ["B", "2"]] },
  { type: "ordering", question: "Order", items: ["First", "Second"] },
];

test("validates all four types and optional multiline explanations", () => {
  const quiz = model.validateQuiz({ title: "Demo", questions });
  assert.equal(quiz.questions.length, 4);
  assert.equal(quiz.questions[0].explanation, "One.\n\nTwo.");
  assert.equal(quiz.questions[1].explanation, null);
});

test("rejects malformed matching pairs", () => {
  assert.throws(
    () => model.validateQuiz({ questions: [{ ...questions[2], pairs: [["A", "1"], ["B"]] }] }),
    /pair 2 must contain exactly two strings/,
  );
});

test("evaluates choices, matching, and ordering", () => {
  assert.equal(model.isChoiceCorrect(new Set([0, 2]), [1, 3]), true);
  assert.equal(model.isMatchingCorrect(new Map([[0, 0], [1, 1]]), 2), true);
  assert.equal(model.isOrderingCorrect([0, 1, 2]), true);
  assert.equal(model.isOrderingCorrect([1, 0, 2]), false);
});

test("enforces one-to-one matching when reconnecting", () => {
  const existing = new Map([[0, 0], [1, 1]]);
  assert.deepEqual([...model.connectPair(existing, 0, 1)], [[0, 1]]);
  assert.deepEqual([...existing], [[0, 0], [1, 1]]);
});

test("deselects a pending matching card when it is clicked again", () => {
  assert.deepEqual(
    model.updateMatchingSelection(new Map(), 1, null, "prompt", 1),
    { connections: new Map(), pendingPrompt: null, pendingMatch: null, action: "pending" },
  );
});

test("disconnects a matched card and leaves the clicked card selected", () => {
  assert.deepEqual(
    model.updateMatchingSelection(new Map([[0, 1]]), null, null, "match", 1),
    { connections: new Map(), pendingPrompt: null, pendingMatch: 1, action: "disconnected" },
  );
});

test("moves ordering items immutably", () => {
  const order = [2, 0, 1];
  assert.deepEqual(model.moveItem(order, 0, 2), [0, 1, 2]);
  assert.deepEqual(order, [2, 0, 1]);
});

test("reshuffles an existing order without repeating or mutating it", () => {
  const order = [2, 0, 1];
  assert.deepEqual(model.reshuffledOrder(order, () => 0.999), [1, 0, 2]);
  assert.deepEqual(order, [2, 0, 1]);
});

test("randomizes the first rendered order even when the shuffle produces identity", () => {
  assert.deepEqual(model.shuffledIndices(4, () => 0.999), [3, 2, 1, 0]);
});

test("classifies evaluated choice options", () => {
  const selected = new Set([0, 1]);
  assert.equal(model.choiceResult(0, selected, [1, 3]), "correct");
  assert.equal(model.choiceResult(1, selected, [1, 3]), "incorrect");
  assert.equal(model.choiceResult(2, selected, [1, 3]), "missed");
});

test("classifies matching and ordering positions", () => {
  assert.equal(model.matchingResult(1, 1), "correct");
  assert.equal(model.matchingResult(1, 0), "incorrect");
  assert.equal(model.orderingResult([0, 2, 1], 0), "correct");
  assert.equal(model.orderingResult([0, 2, 1], 1), "incorrect");
});

test("calculates a rounded completion score", () => {
  assert.deepEqual(model.score([true, false, true]), { correct: 2, total: 3, percentage: 67 });
  assert.deepEqual(model.score([]), { correct: 0, total: 0, percentage: 0 });
});
