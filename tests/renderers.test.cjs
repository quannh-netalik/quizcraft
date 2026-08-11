const test = require("node:test");
const assert = require("node:assert/strict");
const { installObsidianDom } = require("./dom-test-helpers.cjs");

const choiceRenderer = require("../.test-dist/choice-renderer.cjs");
const matchingRenderer = require("../.test-dist/matching-renderer.cjs");
const orderingRenderer = require("../.test-dist/ordering-renderer.cjs");

const choiceQuestion = {
  type: "multiple",
  question: "Pick",
  options: ["Alpha", "Beta"],
  answers: [1, 2],
  explanation: null,
};

test("choice selection updates state without rebuilding its host", async () => {
  const { Window } = await import("happy-dom");
  const window = new Window();
  installObsidianDom(window);
  const host = document.createElement("div");
  const state = {
    selected: new Set(),
    choiceOrder: [0, 1],
    connections: new Map(),
    matchOrder: [],
    order: [],
    checked: false,
    correct: false,
  };
  let stateChanges = 0;

  choiceRenderer.renderChoiceQuestion(choiceQuestion, state, {
    host,
    inputName: "quiz-1-question-0",
    renderMarkdown: (markdown, element) => element.setText(markdown),
    stateChanged: () => { stateChanges += 1; },
  });
  const options = host.firstElementChild;
  const input = host.querySelector("input");
  input.checked = true;
  input.dispatchEvent(new Event("change"));

  assert.deepEqual([...state.selected], [0]);
  assert.equal(stateChanges, 1);
  assert.equal(host.firstElementChild, options);
});

test("matching connects cards in place and cleanup cancels scheduled work", async () => {
  const { Window } = await import("happy-dom");
  const window = new Window();
  installObsidianDom(window);
  let disconnected = false;
  const cancelledFrames = [];
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    disconnect() { disconnected = true; }
  };
  global.requestAnimationFrame = () => 41;
  global.cancelAnimationFrame = (frame) => cancelledFrames.push(frame);
  const host = document.createElement("div");
  const state = {
    selected: new Set(),
    choiceOrder: [],
    connections: new Map(),
    matchOrder: [0, 1],
    order: [],
    checked: false,
    correct: false,
  };
  let stateChanges = 0;

  const cleanup = matchingRenderer.renderMatchingQuestion({
    type: "matching",
    question: "Match",
    pairs: [["A", "1"], ["B", "2"]],
    explanation: null,
  }, state, {
    host,
    renderMarkdown: (markdown, element) => element.setText(markdown),
    stateChanged: () => { stateChanges += 1; },
  });
  host.querySelector('[data-prompt="0"]').click();
  host.querySelector('[data-match="0"]').click();

  assert.deepEqual([...state.connections], [[0, 0]]);
  assert.equal(stateChanges, 1);
  assert.equal(host.querySelectorAll(".obquiz-match-card").length, 4);

  cleanup();
  assert.equal(disconnected, true);
  assert.deepEqual(cancelledFrames, [41]);
});

test("ordering cleanup cancels a pending drag animation", async () => {
  const { Window } = await import("happy-dom");
  const window = new Window();
  installObsidianDom(window);
  const cancelledFrames = [];
  global.requestAnimationFrame = () => 73;
  global.cancelAnimationFrame = (frame) => cancelledFrames.push(frame);
  const host = document.createElement("div");
  const state = {
    selected: new Set(),
    choiceOrder: [],
    connections: new Map(),
    matchOrder: [],
    order: [0, 1],
    checked: false,
    correct: false,
  };

  const cleanup = orderingRenderer.renderOrderingQuestion({
    type: "ordering",
    question: "Order",
    items: ["First", "Second"],
    explanation: null,
  }, state, {
    host,
    renderMarkdown: (markdown, element) => element.setText(markdown),
    stateChanged: () => {},
    rerender: () => {},
  });
  const dragStart = new Event("dragstart");
  Object.defineProperty(dragStart, "dataTransfer", { value: { effectAllowed: "none" } });
  host.querySelector(".obquiz-order-card").dispatchEvent(dragStart);
  cleanup();

  assert.deepEqual(cancelledFrames, [73]);
});
