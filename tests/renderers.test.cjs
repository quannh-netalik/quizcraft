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
  assert.equal(input.closest(".obquiz-option").classList.contains("is-selected"), true);
  assert.equal(stateChanges, 1);
  assert.equal(host.firstElementChild, options);
});

test("choice labels expose disabled and keyboard-focus state", async () => {
  const { Window } = await import("happy-dom");
  const window = new Window();
  installObsidianDom(window);
  const host = document.createElement("div");
  const state = {
    selected: new Set([0]),
    choiceOrder: [0, 1],
    connections: new Map(),
    promptOrder: [],
    matchOrder: [],
    order: [],
    checked: true,
    correct: true,
  };

  choiceRenderer.renderChoiceQuestion(choiceQuestion, state, {
    host,
    inputName: "quiz-1-question-0",
    renderMarkdown: (markdown, element) => element.setText(markdown),
    stateChanged: () => {},
  });
  const input = host.querySelector("input");
  const label = input.closest(".obquiz-option");
  input.matches = (selector) => selector === ":focus-visible";

  assert.equal(label.classList.contains("is-selected"), true);
  assert.equal(label.classList.contains("is-disabled"), true);

  input.dispatchEvent(new Event("focus"));
  assert.equal(label.classList.contains("has-focus-visible"), true);

  input.dispatchEvent(new Event("blur"));
  assert.equal(label.classList.contains("has-focus-visible"), false);
});

test("single choice selection moves the selected label state", async () => {
  const { Window } = await import("happy-dom");
  const window = new Window();
  installObsidianDom(window);
  const host = document.createElement("div");
  const state = {
    selected: new Set([0]),
    choiceOrder: [0, 1],
    connections: new Map(),
    promptOrder: [],
    matchOrder: [],
    order: [],
    checked: false,
    correct: false,
  };

  choiceRenderer.renderChoiceQuestion({ ...choiceQuestion, type: "single", answers: [2] }, state, {
    host,
    inputName: "quiz-1-question-0",
    renderMarkdown: (markdown, element) => element.setText(markdown),
    stateChanged: () => {},
  });
  const inputs = host.querySelectorAll("input");
  inputs[1].checked = true;
  inputs[1].dispatchEvent(new Event("change"));

  assert.equal(inputs[0].closest(".obquiz-option").classList.contains("is-selected"), false);
  assert.equal(inputs[1].closest(".obquiz-option").classList.contains("is-selected"), true);
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
  window.requestAnimationFrame = () => 41;
  window.cancelAnimationFrame = (frame) => cancelledFrames.push(frame);
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
  window.requestAnimationFrame = () => 51;
  window.cancelAnimationFrame = () => {};
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
  window.requestAnimationFrame = () => 73;
  window.cancelAnimationFrame = (frame) => cancelledFrames.push(frame);
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

test("ordering applies the measured offset before the animation frame runs", async () => {
  const { Window } = await import("happy-dom");
  const window = new Window();
  installObsidianDom(window);
  const queuedFrames = [];
  window.requestAnimationFrame = (callback) => {
    queuedFrames.push(callback);
    return queuedFrames.length;
  };
  window.cancelAnimationFrame = () => {};
  window.HTMLElement.prototype.setCssProps = function setCssProps(properties) {
    for (const [name, value] of Object.entries(properties)) this.style.setProperty(name, value);
  };
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
  const cards = host.querySelectorAll(".obquiz-order-card");
  cards.forEach((card) => {
    card.getBoundingClientRect = () => ({
      top: [...card.parentElement.children].indexOf(card) * 40,
      height: 40,
    });
  });
  const dragStart = new Event("dragstart");
  Object.defineProperty(dragStart, "dataTransfer", { value: { effectAllowed: "none" } });
  cards[0].dispatchEvent(dragStart);
  cards[1].dispatchEvent(new window.MouseEvent("dragover", { bubbles: true, clientY: 61 }));

  const movedCard = host.querySelector('[data-order-item="0"]');
  assert.equal(movedCard.style.getPropertyValue("--obquiz-order-offset"), "-40px");
  assert.equal(movedCard.classList.contains("is-reordering-from"), true);
  assert.equal(movedCard.classList.contains("is-reordering"), false);

  cleanup();
});

async function createOrderingAnimationHarness(transitionDuration = "180ms") {
  const { Window } = await import("happy-dom");
  const window = new Window();
  installObsidianDom(window);
  const queuedFrames = new Map();
  let nextFrame = 1;
  window.requestAnimationFrame = (callback) => {
    const frame = nextFrame;
    nextFrame += 1;
    queuedFrames.set(frame, callback);
    return frame;
  };
  window.cancelAnimationFrame = (frame) => queuedFrames.delete(frame);
  window.getComputedStyle = () => ({ transitionDuration, transitionDelay: "0s" });
  window.HTMLElement.prototype.setCssProps = function setCssProps(properties) {
    for (const [name, value] of Object.entries(properties)) this.style.setProperty(name, value);
  };
  const host = document.createElement("div");
  const state = {
    selected: new Set(),
    choiceOrder: [],
    connections: new Map(),
    promptOrder: [],
    matchOrder: [],
    order: [0, 1, 2],
    checked: false,
    correct: false,
  };
  const cleanup = orderingRenderer.renderOrderingQuestion({
    type: "ordering",
    question: "Order",
    items: ["First", "Second", "Third"],
    explanation: null,
  }, state, {
    host,
    renderMarkdown: (markdown, element) => element.setText(markdown),
    stateChanged: () => {},
    rerender: () => {},
  });
  const cards = host.querySelectorAll(".obquiz-order-card");
  cards.forEach((card) => {
    card.getBoundingClientRect = () => ({
      top: [...card.parentElement.children].indexOf(card) * 40,
      height: 40,
    });
  });
  const dragStart = new Event("dragstart");
  Object.defineProperty(dragStart, "dataTransfer", { value: { effectAllowed: "none" } });
  cards[0].dispatchEvent(dragStart);

  return {
    window,
    host,
    cards,
    cleanup,
    runFrames() {
      for (const [frame, callback] of [...queuedFrames]) {
        queuedFrames.delete(frame);
        callback();
      }
    },
  };
}

test("ordering restarts an active card animation from a transition-free inversion", async () => {
  const harness = await createOrderingAnimationHarness();
  harness.cards[1].dispatchEvent(new harness.window.MouseEvent("dragover", { bubbles: true, clientY: 61 }));
  harness.runFrames();
  const movedCard = harness.host.querySelector('[data-order-item="1"]');
  assert.equal(movedCard.classList.contains("is-reordering"), true);

  movedCard.dispatchEvent(new harness.window.MouseEvent("dragover", { bubbles: true, clientY: 0 }));

  assert.equal(movedCard.classList.contains("is-reordering"), false);
  assert.equal(movedCard.classList.contains("is-reordering-from"), true);
  assert.equal(movedCard.style.getPropertyValue("--obquiz-order-offset"), "-40px");
  harness.cleanup();
});

test("ordering teardown clears active transition state", async () => {
  const harness = await createOrderingAnimationHarness();
  harness.cards[1].dispatchEvent(new harness.window.MouseEvent("dragover", { bubbles: true, clientY: 61 }));
  harness.runFrames();
  const movedCard = harness.host.querySelector('[data-order-item="1"]');

  harness.cleanup();

  assert.equal(movedCard.classList.contains("is-reordering"), false);
  assert.equal(movedCard.classList.contains("is-reordering-from"), false);
  assert.equal(movedCard.style.getPropertyValue("--obquiz-order-offset"), "");
});

test("ordering clears transition state when the transition is cancelled", async () => {
  const harness = await createOrderingAnimationHarness();
  harness.cards[1].dispatchEvent(new harness.window.MouseEvent("dragover", { bubbles: true, clientY: 61 }));
  harness.runFrames();
  const movedCard = harness.host.querySelector('[data-order-item="1"]');

  const transitionCancel = new Event("transitioncancel");
  Object.defineProperty(transitionCancel, "propertyName", { value: "transform" });
  movedCard.dispatchEvent(transitionCancel);

  assert.equal(movedCard.classList.contains("is-reordering"), false);
  assert.equal(movedCard.style.getPropertyValue("--obquiz-order-offset"), "");
  harness.cleanup();
});

test("ordering ignores unrelated transition events", async () => {
  for (const eventType of ["transitionend", "transitioncancel"]) {
    const harness = await createOrderingAnimationHarness();
    harness.cards[1].dispatchEvent(new harness.window.MouseEvent("dragover", { bubbles: true, clientY: 61 }));
    harness.runFrames();
    const movedCard = harness.host.querySelector('[data-order-item="1"]');
    const unrelatedTransition = new Event(eventType);
    Object.defineProperty(unrelatedTransition, "propertyName", { value: "border-color" });

    movedCard.dispatchEvent(unrelatedTransition);

    assert.equal(movedCard.classList.contains("is-reordering"), true);
    assert.notEqual(movedCard.style.getPropertyValue("--obquiz-order-offset"), "");

    const childTransition = new Event(eventType, { bubbles: true });
    Object.defineProperty(childTransition, "propertyName", { value: "transform" });
    movedCard.firstElementChild.dispatchEvent(childTransition);

    assert.equal(movedCard.classList.contains("is-reordering"), true);

    const transformTransition = new Event(eventType);
    Object.defineProperty(transformTransition, "propertyName", { value: "transform" });
    movedCard.dispatchEvent(transformTransition);

    assert.equal(movedCard.classList.contains("is-reordering"), false);
    assert.equal(movedCard.style.getPropertyValue("--obquiz-order-offset"), "");
    harness.cleanup();
  }
});

test("ordering clears transition state immediately when transitions have zero duration", async () => {
  const harness = await createOrderingAnimationHarness("0s");
  harness.cards[1].dispatchEvent(new harness.window.MouseEvent("dragover", { bubbles: true, clientY: 61 }));

  harness.runFrames();

  const movedCard = harness.host.querySelector('[data-order-item="1"]');
  assert.equal(movedCard.classList.contains("is-reordering"), false);
  assert.equal(movedCard.style.getPropertyValue("--obquiz-order-offset"), "");
  harness.cleanup();
});
