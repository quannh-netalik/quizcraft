import { moveItem, orderingResult } from "../model";
import type { OrderingQuestion } from "../model";
import type { QuestionState } from "../quiz-state";
import type { RendererCleanup, RendererContext } from "./contracts";

export function renderOrderingQuestion(
  question: OrderingQuestion,
  state: QuestionState,
  context: RendererContext,
): RendererCleanup {
  const ownerWindow = context.host.ownerDocument.defaultView ?? window;
  const list = context.host.createDiv({ cls: "obquiz-ordering" });
  let draggedOriginalIndex: number | null = null;
  let dragFrame: number | null = null;
  const animationFrames = new Set<number>();

  const scheduleAnimation = (callback: () => void): number => {
    const frame = ownerWindow.requestAnimationFrame(() => {
      animationFrames.delete(frame);
      callback();
    });
    animationFrames.add(frame);
    return frame;
  };

  const updateCards = (): void => {
    list.querySelectorAll<HTMLElement>(".obquiz-order-card").forEach((item) => {
      const originalIndex = Number(item.dataset.orderItem);
      const position = state.order.indexOf(originalIndex);
      item.querySelector<HTMLElement>(".obquiz-order-index")?.setText(String(position + 1));
      const controls = item.querySelectorAll<HTMLButtonElement>(".obquiz-order-controls button");
      if (controls[0]) controls[0].disabled = state.checked || position === 0;
      if (controls[1]) controls[1].disabled = state.checked || position === state.order.length - 1;
    });
  };

  const finishDrag = (): void => {
    if (dragFrame !== null) {
      ownerWindow.cancelAnimationFrame(dragFrame);
      animationFrames.delete(dragFrame);
    }
    dragFrame = null;
    draggedOriginalIndex = null;
    list.querySelectorAll(".is-dragging").forEach((item) => item.removeClass("is-dragging"));
  };

  const reorder = (from: number, to: number): void => {
    if (state.checked) return;
    state.order = moveItem(state.order, from, to);
    context.rerender();
  };

  state.order.forEach((originalIndex, currentIndex) => {
    const card = list.createDiv({ cls: "obquiz-order-card" });
    card.dataset.orderItem = String(originalIndex);
    if (state.checked) card.addClass(`is-${orderingResult(state.order, currentIndex)}`);
    card.draggable = !state.checked;
    card.createDiv({ cls: "obquiz-drag-handle", text: "⋮⋮", attr: { "aria-hidden": "true" } });
    card.createSpan({ cls: "obquiz-order-index", text: String(currentIndex + 1) });
    const content = card.createDiv({ cls: "obquiz-order-content" });
    context.renderMarkdown(question.items[originalIndex]!, content);
    const controls = card.createDiv({ cls: "obquiz-order-controls" });
    const up = controls.createEl("button", { text: "↑", attr: { "aria-label": "Move up" } });
    const down = controls.createEl("button", { text: "↓", attr: { "aria-label": "Move down" } });
    up.disabled = state.checked || currentIndex === 0;
    down.disabled = state.checked || currentIndex === state.order.length - 1;
    up.addEventListener("click", () => reorder(state.order.indexOf(originalIndex), state.order.indexOf(originalIndex) - 1));
    down.addEventListener("click", () => reorder(state.order.indexOf(originalIndex), state.order.indexOf(originalIndex) + 1));
    card.addEventListener("dragstart", (event) => {
      draggedOriginalIndex = originalIndex;
      event.dataTransfer!.effectAllowed = "move";
      dragFrame = scheduleAnimation(() => {
        card.addClass("is-dragging");
        dragFrame = null;
      });
    });
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (draggedOriginalIndex === null || draggedOriginalIndex === originalIndex) return;
      const from = state.order.indexOf(draggedOriginalIndex);
      const to = state.order.indexOf(originalIndex);
      const bounds = card.getBoundingClientRect();
      const crossedMidpoint = from < to
        ? event.clientY >= bounds.top + bounds.height / 2
        : event.clientY <= bounds.top + bounds.height / 2;
      if (!crossedMidpoint) return;
      const previous = new Map<number, DOMRect>();
      list.querySelectorAll<HTMLElement>(".obquiz-order-card").forEach((item) => {
        previous.set(Number(item.dataset.orderItem), item.getBoundingClientRect());
      });
      state.order = moveItem(state.order, from, to);
      const cards = new Map(
        Array.from(list.querySelectorAll<HTMLElement>(".obquiz-order-card"))
          .map((item) => [Number(item.dataset.orderItem), item] as const),
      );
      state.order.forEach((item) => list.append(cards.get(item)!));
      updateCards();
      animateOrderingCards(list, previous, scheduleAnimation);
    });
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      finishDrag();
    });
      card.addEventListener("dragend", finishDrag);
  });

  return () => {
    finishDrag();
    animationFrames.forEach((frame) => ownerWindow.cancelAnimationFrame(frame));
    animationFrames.clear();
  };
}

function animateOrderingCards(
  list: HTMLElement,
  previous: Map<number, DOMRect>,
  scheduleAnimation: (callback: () => void) => number,
): void {
  list.querySelectorAll<HTMLElement>(".obquiz-order-card").forEach((card) => {
    if (card.hasClass("is-dragging")) return;
    const before = previous.get(Number(card.dataset.orderItem));
    if (!before) return;
    const after = card.getBoundingClientRect();
    const offset = before.top - after.top;
    if (!offset) return;
    card.setCssProps({ "--obquiz-order-offset": `${offset}px` });
    card.addClass("is-reordering-from");
    scheduleAnimation(() => {
      card.removeClass("is-reordering-from");
      card.addClass("is-reordering");
      card.addEventListener("transitionend", () => {
        card.removeClass("is-reordering");
        card.style.removeProperty("--obquiz-order-offset");
      }, { once: true });
    });
  });
}
