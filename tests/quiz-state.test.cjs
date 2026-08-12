const test = require("node:test");
const assert = require("node:assert/strict");

const state = require("../.test-dist/quiz-state.cjs");

const single = { type: "single", question: "Pick", options: ["A", "B"], answers: [2], explanation: null };
const multiple = { type: "multiple", question: "Pick", options: ["A", "B"], answers: [1, 2], explanation: null };
const matching = { type: "matching", question: "Match", pairs: [["A", "1"], ["B", "2"], ["C", "3"]], explanation: null };
const ordering = { type: "ordering", question: "Order", items: ["A", "B"], explanation: null };

test("creates interaction-specific initial question state", () => {
  const choiceState = state.createQuestionState(single, undefined, () => 0.999);
  const matchingRandom = [0.1, 0.1, 0.9, 0.1];
  const matchingState = state.createQuestionState(matching, undefined, () => matchingRandom.shift());
  const orderingState = state.createQuestionState(ordering, undefined, () => 0.999);

  assert.deepEqual(choiceState.choiceOrder, [1, 0]);
  assert.deepEqual(matchingState.promptOrder, [1, 2, 0]);
  assert.deepEqual(matchingState.matchOrder, [1, 0, 2]);
  assert.deepEqual(orderingState.order, [1, 0]);
  assert.deepEqual([...choiceState.selected], []);
  assert.deepEqual([...matchingState.connections], []);
  assert.equal(choiceState.checked, false);
  assert.equal(choiceState.correct, false);
});

test("reset independently reshuffles both matching column orders", () => {
  const previous = {
    selected: new Set(),
    choiceOrder: [],
    connections: new Map([[0, 0]]),
    promptOrder: [1, 2, 0],
    matchOrder: [1, 0, 2],
    order: [],
    checked: true,
    correct: false,
  };

  const reset = state.createQuestionState(matching, previous, () => 0.999);

  assert.deepEqual(reset.promptOrder, [0, 2, 1]);
  assert.deepEqual(reset.matchOrder, [2, 0, 1]);
  assert.deepEqual([...reset.connections], []);
});

test("reset clears answers and reshuffles the displayed order", () => {
  const previous = {
    selected: new Set([0]),
    choiceOrder: [1, 0],
    connections: new Map(),
    promptOrder: [],
    matchOrder: [],
    order: [],
    checked: true,
    correct: true,
  };

  const reset = state.createQuestionState(single, previous, () => 0.999);

  assert.deepEqual(reset.choiceOrder, [0, 1]);
  assert.deepEqual([...reset.selected], []);
  assert.equal(reset.checked, false);
  assert.equal(reset.correct, false);
});

test("requires a complete response before evaluation", () => {
  const choiceState = state.createQuestionState(multiple);
  const matchingState = state.createQuestionState(matching);
  const orderingState = state.createQuestionState(ordering);

  assert.equal(state.isQuestionReady(multiple, choiceState), false);
  choiceState.selected.add(0);
  assert.equal(state.isQuestionReady(multiple, choiceState), true);
  assert.equal(state.isQuestionReady(matching, matchingState), false);
  matchingState.connections = new Map([[0, 0], [1, 1], [2, 2]]);
  assert.equal(state.isQuestionReady(matching, matchingState), true);
  assert.equal(state.isQuestionReady(ordering, orderingState), true);
});

test("evaluates every question type without changing checked state", () => {
  const singleState = state.createQuestionState(single);
  singleState.selected.add(1);
  const multipleState = state.createQuestionState(multiple);
  multipleState.selected = new Set([0, 1]);
  const matchingState = state.createQuestionState(matching);
  matchingState.connections = new Map([[0, 0], [1, 1], [2, 2]]);
  const orderingState = state.createQuestionState(ordering);
  orderingState.order = [0, 1];

  assert.equal(state.evaluateQuestion(single, singleState), true);
  assert.equal(state.evaluateQuestion(multiple, multipleState), true);
  assert.equal(state.evaluateQuestion(matching, matchingState), true);
  assert.equal(state.evaluateQuestion(ordering, orderingState), true);
  assert.equal(singleState.checked, false);
});
