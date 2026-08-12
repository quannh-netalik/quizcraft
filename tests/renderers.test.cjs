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

test("matching curve keeps a horizontal terminal tangent when cards are level", () => {
  const curve = matchingRenderer.createMatchCurve(0, 40, 200, 40);

  assert.equal(curve.control2Y, curve.y2);
});

test("matching curve points upward when the destination is above", () => {
  const curve = matchingRenderer.createMatchCurve(0, 240, 200, 40);

  assert.ok(curve.control2Y > curve.y2);
  assert.ok(Math.abs(curve.control2Y - curve.y2) <= curve.bend);
});

test("matching curve points downward when the destination is below", () => {
  const curve = matchingRenderer.createMatchCurve(0, 40, 200, 240);

  assert.ok(curve.control2Y < curve.y2);
  assert.ok(Math.abs(curve.control2Y - curve.y2) <= curve.bend);
});

test("choice selection updates state without rebuilding its host", async () => {
  const { Window } = await import("happy-dom");
  const window = new Window();
  installObsidianDom(window);
  const host = document.createElement("div");
  const state = {
    selected: new Set(),
    choiceOrder: [0, 1],
    connections: new Map(),
    promptOrder: [],
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

test("matching columns follow independent orders and connections update in place", async () => {
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
    promptOrder: [1, 0],
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
  const columns = host.querySelectorAll(".obquiz-match-column");
  assert.deepEqual([...columns[0].querySelectorAll("[data-prompt]")].map((card) => card.dataset.prompt), ["1", "0"]);
  assert.deepEqual([...columns[1].querySelectorAll("[data-match]")].map((card) => card.dataset.match), ["0", "1"]);

  cleanup();
  assert.equal(disconnected, true);
  assert.deepEqual(cancelledFrames, [41]);
});

test("matching card text selection suppresses only the pointer activation", async () => {
  const { Window } = await import("happy-dom");
  const window = new Window();
  installObsidianDom(window);
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    disconnect() {}
  };
  global.requestAnimationFrame = () => 51;
  global.cancelAnimationFrame = () => {};
  const host = document.createElement("div");
  const state = {
    selected: new Set(),
    choiceOrder: [],
    connections: new Map(),
    promptOrder: [0, 1],
    matchOrder: [1, 0],
    order: [],
    checked: false,
    correct: false,
  };

  const cleanup = matchingRenderer.renderMatchingQuestion({
    type: "matching",
    question: "Match",
    pairs: [["Alpha prompt", "Alpha match"], ["Beta prompt", "Beta match"]],
    explanation: null,
  }, state, {
    host,
    renderMarkdown: (markdown, element) => element.setText(markdown),
    stateChanged: () => {},
  });
  const card = host.querySelector('[data-prompt="0"]');
  const content = card.querySelector(".obquiz-match-content");
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(content);
  selection.removeAllRanges();
  selection.addRange(range);

  card.dispatchEvent(new window.MouseEvent("click", { bubbles: true, detail: 1 }));
  assert.equal(card.classList.contains("is-pending"), false);

  selection.removeAllRanges();
  card.dispatchEvent(new window.MouseEvent("click", { bubbles: true, detail: 1 }));
  assert.equal(card.classList.contains("is-pending"), true);

  cleanup();
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
    promptOrder: [],
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
