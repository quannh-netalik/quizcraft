import { MarkdownPostProcessorContext, MarkdownRenderer, Plugin, parseYaml } from "obsidian";
import {
  ChoiceQuestion,
  MatchingQuestion,
  OrderingQuestion,
  Question,
  Quiz,
  choiceResult,
  isChoiceCorrect,
  isMatchingCorrect,
  isOrderingCorrect,
  matchingResult,
  moveItem,
  orderingResult,
  reshuffledOrder,
  score,
  shuffledIndices,
  updateMatchingSelection,
  validateQuiz,
} from "./model";

type QuestionState = {
  selected: Set<number>;
  choiceOrder: number[];
  connections: Map<number, number>;
  matchOrder: number[];
  order: number[];
  checked: boolean;
  correct: boolean;
};

const TYPE_LABELS: Record<Question["type"], string> = {
  single: "Single Choice",
  multiple: "Multiple Choice",
  matching: "Matching",
  ordering: "Ordering",
};

export default class ObquizPlugin extends Plugin {
  onload(): void {
    this.registerMarkdownCodeBlockProcessor("obquiz", (source, element, context) => {
      try {
        new QuizController(this, validateQuiz(parseYaml(source)), element, context).render();
      } catch (error) {
        element.empty();
        const message = error instanceof Error ? error.message : String(error);
        element.createDiv({ cls: "obquiz-error", text: `Obquiz: ${message}` });
      }
    });
  }
}

export class QuizController {
  private index = 0;
  private states: QuestionState[];
  private questionHost!: HTMLElement;
  private pager!: HTMLElement;
  private matchingObserver: ResizeObserver | null = null;

  constructor(
    private readonly plugin: ObquizPlugin,
    private readonly quiz: Quiz,
    private readonly root: HTMLElement,
    private readonly context: MarkdownPostProcessorContext,
  ) {
    this.states = quiz.questions.map((question) => this.newState(question));
  }

  render(): void {
    this.root.empty();
    this.root.addClass("obquiz");
    if (this.quiz.title) this.root.createEl("h3", { cls: "obquiz-title", text: this.quiz.title });
    this.questionHost = this.root.createDiv({ cls: "obquiz-question-host" });
    this.pager = this.root.createDiv({ cls: "obquiz-pager" });
    this.showQuestion(0);
  }

  private newState(question: Question, previous?: QuestionState): QuestionState {
    const choiceOrder = question.type === "single" || question.type === "multiple"
      ? previous ? reshuffledOrder(previous.choiceOrder) : shuffledIndices(question.options.length)
      : [];
    const matchOrder = question.type === "matching"
      ? previous ? reshuffledOrder(previous.matchOrder) : shuffledIndices(question.pairs.length)
      : [];
    const order = question.type === "ordering"
      ? previous ? reshuffledOrder(previous.order) : shuffledIndices(question.items.length)
      : [];
    return {
      selected: new Set(),
      choiceOrder,
      connections: new Map(),
      matchOrder,
      order,
      checked: false,
      correct: false,
    };
  }

  private showQuestion(index: number): void {
    this.matchingObserver?.disconnect();
    this.matchingObserver = null;
    this.index = index;
    this.questionHost.empty();
    const question = this.quiz.questions[index]!;
    const state = this.states[index]!;
    const card = this.questionHost.createDiv({ cls: "obquiz-question" });
    const header = card.createDiv({ cls: "obquiz-question-header" });
    const meta = header.createDiv({ cls: "obquiz-question-meta" });
    meta.createSpan({ cls: "obquiz-question-type", text: TYPE_LABELS[question.type] });
    if (state.checked) {
      meta.createSpan({
        cls: `obquiz-status is-${state.correct ? "correct" : "incorrect"}`,
        text: state.correct ? "Correct" : "Incorrect",
      });
    }
    header.createEl("button", {
      cls: "obquiz-question-reset",
      text: "↻ Reset",
      attr: { "aria-label": "Reset this question" },
    }).addEventListener("click", () => this.resetCurrent());
    const prompt = card.createDiv({ cls: "obquiz-prompt" });
    this.renderMarkdown(question.question, prompt);
    const interaction = card.createDiv({ cls: "obquiz-interaction" });

    switch (question.type) {
      case "single": this.renderSingle(question, state, interaction); break;
      case "multiple": this.renderMultiple(question, state, interaction); break;
      case "matching": this.renderMatching(question, state, interaction); break;
      case "ordering": this.renderOrdering(question, state, interaction); break;
    }

    if (!state.checked) {
      const actions = card.createDiv({ cls: "obquiz-actions" });
      const check = actions.createEl("button", { text: "Check Answer", cls: "mod-cta obquiz-check" });
      check.disabled = !this.isReady(question, state);
      check.addEventListener("click", () => this.checkCurrent());
    } else if (question.explanation) {
      const explanation = card.createDiv({ cls: "obquiz-explanation" });
      this.renderMarkdown(question.explanation, explanation);
    }
    this.renderPager();
  }

  private renderSingle(question: ChoiceQuestion, state: QuestionState, host: HTMLElement): void {
    this.renderChoice(question, state, host, "radio");
  }

  private renderMultiple(question: ChoiceQuestion, state: QuestionState, host: HTMLElement): void {
    this.renderChoice(question, state, host, "checkbox");
  }

  private renderChoice(question: ChoiceQuestion, state: QuestionState, host: HTMLElement, type: "radio" | "checkbox"): void {
    const options = host.createDiv({ cls: "obquiz-options" });
    state.choiceOrder.forEach((optionIndex, displayIndex) => {
      const option = question.options[optionIndex]!;
      const label = options.createEl("label", { cls: "obquiz-option" });
      if (state.checked) {
        const result = choiceResult(optionIndex, state.selected, question.answers);
        if (result) label.addClass(`is-${result}`);
      }
      const input = label.createEl("input");
      input.type = type;
      input.name = `obquiz-${this.context.sourcePath}-${this.index}`;
      input.checked = state.selected.has(optionIndex);
      input.disabled = state.checked;
      label.createSpan({ cls: "obquiz-option-index", text: String.fromCharCode(65 + displayIndex) });
      const content = label.createDiv({ cls: "obquiz-option-content" });
      this.renderMarkdown(option, content);
      input.addEventListener("change", () => {
        if (type === "radio") state.selected.clear();
        input.checked ? state.selected.add(optionIndex) : state.selected.delete(optionIndex);
        this.showQuestion(this.index);
      });
    });
  }

  private renderMatching(question: MatchingQuestion, state: QuestionState, host: HTMLElement): void {
    const matching = host.createDiv({ cls: "obquiz-matching" });
    const lines = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    lines.classList.add("obquiz-match-lines");
    lines.setAttribute("aria-hidden", "true");
    matching.appendChild(lines);
    const leftColumn = matching.createDiv({ cls: "obquiz-match-column" });
    const rightColumn = matching.createDiv({ cls: "obquiz-match-column" });
    let pendingPrompt: number | null = null;
    let pendingMatch: number | null = null;

    const choosePrompt = (promptIndex: number): void => {
      if (state.checked) return;
      const selection = updateMatchingSelection(state.connections, pendingPrompt, pendingMatch, "prompt", promptIndex);
      state.connections = selection.connections;
      pendingPrompt = selection.pendingPrompt;
      pendingMatch = selection.pendingMatch;
      if (selection.action === "connected") this.showQuestion(this.index);
      else refreshMatchingState();
    };
    const chooseMatch = (matchIndex: number): void => {
      if (state.checked) return;
      const selection = updateMatchingSelection(state.connections, pendingPrompt, pendingMatch, "match", matchIndex);
      state.connections = selection.connections;
      pendingPrompt = selection.pendingPrompt;
      pendingMatch = selection.pendingMatch;
      if (selection.action === "connected") this.showQuestion(this.index);
      else refreshMatchingState();
    };
    const markPending = (): void => {
      matching.querySelectorAll(".is-pending").forEach((element) => element.classList.remove("is-pending"));
      if (pendingPrompt !== null) matching.querySelector(`[data-prompt="${pendingPrompt}"]`)?.classList.add("is-pending");
      if (pendingMatch !== null) matching.querySelector(`[data-match="${pendingMatch}"]`)?.classList.add("is-pending");
      drawLines();
    };
    const refreshMatchingState = (): void => {
      matching.querySelectorAll<HTMLElement>("[data-prompt]").forEach((card) => {
        const promptIndex = Number(card.dataset.prompt);
        card.toggleClass("is-connected", state.connections.has(promptIndex));
        card.toggleClass("is-unconnected", state.connections.size > 0 && !state.connections.has(promptIndex));
      });
      matching.querySelectorAll<HTMLElement>("[data-match]").forEach((card) => {
        const matchIndex = Number(card.dataset.match);
        const isConnected = [...state.connections.values()].includes(matchIndex);
        card.toggleClass("is-connected", isConnected);
        card.toggleClass("is-unconnected", state.connections.size > 0 && !isConnected);
      });
      markPending();
    };

    question.pairs.forEach(([prompt], promptIndex) => {
      const matchIndex = state.connections.get(promptIndex);
      const result = state.checked && matchIndex !== undefined ? matchingResult(promptIndex, matchIndex) : null;
      const card = this.matchCard(prompt, leftColumn, () => choosePrompt(promptIndex), result);
      card.dataset.prompt = String(promptIndex);
      card.toggleClass("is-connected", matchIndex !== undefined && !state.checked);
      card.toggleClass("is-unconnected", state.connections.size > 0 && matchIndex === undefined);
      card.append(this.matchPort(`prompt-${promptIndex}`));
      card.disabled = state.checked;
    });
    state.matchOrder.forEach((matchIndex) => {
      const promptEntry = [...state.connections].find(([, connected]) => connected === matchIndex);
      const result = state.checked && promptEntry ? matchingResult(promptEntry[0], matchIndex) : null;
      const card = this.matchCard(question.pairs[matchIndex]![1], rightColumn, () => chooseMatch(matchIndex), result);
      card.dataset.match = String(matchIndex);
      card.toggleClass("is-connected", Boolean(promptEntry) && !state.checked);
      card.toggleClass("is-unconnected", state.connections.size > 0 && !promptEntry);
      card.prepend(this.matchPort(`match-${matchIndex}`));
      card.disabled = state.checked;
    });

    const drawLines = (): void => {
      lines.replaceChildren(this.matchDefinitions());
      const bounds = matching.getBoundingClientRect();
      lines.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
      for (const [promptIndex, matchIndex] of state.connections) {
        const from = matching.querySelector<HTMLElement>(`[data-obquiz-port="prompt-${promptIndex}"]`);
        const to = matching.querySelector<HTMLElement>(`[data-obquiz-port="match-${matchIndex}"]`);
        if (!from || !to) continue;
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        const x1 = a.left + a.width / 2 - bounds.left;
        const y1 = a.top + a.height / 2 - bounds.top;
        const x2 = b.left - bounds.left;
        const y2 = b.top + b.height / 2 - bounds.top;
        const bend = Math.max(36, (x2 - x1) * 0.45);
        const result = state.checked ? matchingResult(promptIndex, matchIndex) : "pending";
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("class", `obquiz-match-line is-${result}`);
        path.setAttribute("d", `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`);
        path.setAttribute("marker-end", `url(#obquiz-arrow-${result})`);
        lines.appendChild(path);
      }
    };
    requestAnimationFrame(drawLines);
    this.matchingObserver = new ResizeObserver(drawLines);
    this.matchingObserver.observe(matching);
  }

  private matchPort(name: string): HTMLSpanElement {
    const port = document.createElement("span");
    port.className = "obquiz-match-port";
    port.dataset.obquizPort = name;
    port.setAttribute("data-obquiz-port", name);
    port.setAttribute("aria-hidden", "true");
    return port;
  }

  private matchDefinitions(): SVGDefsElement {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    for (const state of ["pending", "correct", "incorrect"]) {
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      marker.id = `obquiz-arrow-${state}`;
      marker.setAttribute("markerWidth", "6");
      marker.setAttribute("markerHeight", "6");
      marker.setAttribute("refX", "6");
      marker.setAttribute("refY", "3");
      marker.setAttribute("orient", "auto");
      const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
      arrow.setAttribute("d", "M 0 0 L 6 3 L 0 6 Z");
      arrow.setAttribute("class", `is-${state}`);
      marker.appendChild(arrow);
      defs.appendChild(marker);
    }
    return defs;
  }

  private matchCard(
    markdown: string,
    host: HTMLElement,
    action: () => void,
    result: "correct" | "incorrect" | null,
  ): HTMLButtonElement {
    const button = host.createEl("button", { cls: "obquiz-match-card" });
    if (result) button.addClass(`is-${result}`);
    const content = button.createDiv({ cls: "obquiz-match-content" });
    this.renderMarkdown(markdown, content);
    button.addEventListener("click", action);
    return button;
  }

  private renderOrdering(question: OrderingQuestion, state: QuestionState, host: HTMLElement): void {
    const list = host.createDiv({ cls: "obquiz-ordering" });
    let draggedOriginalIndex: number | null = null;
    let dragFrame: number | null = null;
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
      if (dragFrame !== null) cancelAnimationFrame(dragFrame);
      dragFrame = null;
      draggedOriginalIndex = null;
      list.querySelectorAll(".is-dragging").forEach((item) => item.removeClass("is-dragging"));
    };
    state.order.forEach((originalIndex, currentIndex) => {
      const card = list.createDiv({ cls: "obquiz-order-card" });
      card.dataset.orderItem = String(originalIndex);
      if (state.checked) card.addClass(`is-${orderingResult(state.order, currentIndex)}`);
      card.draggable = !state.checked;
      card.createDiv({ cls: "obquiz-drag-handle", text: "⋮⋮", attr: { "aria-hidden": "true" } });
      card.createSpan({ cls: "obquiz-order-index", text: String(currentIndex + 1) });
      const content = card.createDiv({ cls: "obquiz-order-content" });
      this.renderMarkdown(question.items[originalIndex]!, content);
      const controls = card.createDiv({ cls: "obquiz-order-controls" });
      const up = controls.createEl("button", { text: "↑", attr: { "aria-label": "Move up" } });
      const down = controls.createEl("button", { text: "↓", attr: { "aria-label": "Move down" } });
      up.disabled = state.checked || currentIndex === 0;
      down.disabled = state.checked || currentIndex === state.order.length - 1;
      up.addEventListener("click", () => {
        const position = state.order.indexOf(originalIndex);
        this.reorder(state, position, position - 1);
      });
      down.addEventListener("click", () => {
        const position = state.order.indexOf(originalIndex);
        this.reorder(state, position, position + 1);
      });
      card.addEventListener("dragstart", (event) => {
        draggedOriginalIndex = originalIndex;
        event.dataTransfer!.effectAllowed = "move";
        dragFrame = requestAnimationFrame(() => {
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
        const crossedMidpoint = from < to ? event.clientY >= bounds.top + bounds.height / 2 : event.clientY <= bounds.top + bounds.height / 2;
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
        this.animateOrderingCards(list, previous);
      });
      card.addEventListener("drop", (event) => {
        event.preventDefault();
        finishDrag();
      });
      card.addEventListener("dragend", finishDrag);
    });
  }

  private animateOrderingCards(list: HTMLElement, previous: Map<number, DOMRect>): void {
    list.querySelectorAll<HTMLElement>(".obquiz-order-card").forEach((card) => {
      if (card.hasClass("is-dragging")) return;
      const before = previous.get(Number(card.dataset.orderItem));
      if (!before) return;
      const after = card.getBoundingClientRect();
      const offset = before.top - after.top;
      if (!offset) return;
      card.style.transition = "none";
      card.style.transform = `translateY(${offset}px)`;
      requestAnimationFrame(() => {
        card.addClass("is-reordering");
        card.style.removeProperty("transition");
        card.style.removeProperty("transform");
        card.addEventListener("transitionend", () => card.removeClass("is-reordering"), { once: true });
      });
    });
  }

  private reorder(state: QuestionState, from: number, to: number): void {
    if (state.checked) return;
    state.order = moveItem(state.order, from, to);
    this.showQuestion(this.index);
  }

  private checkCurrent(): void {
    const question = this.quiz.questions[this.index]!;
    const state = this.states[this.index]!;
    if (!this.isReady(question, state)) return;
    state.checked = true;
    if (question.type === "single" || question.type === "multiple") state.correct = isChoiceCorrect(state.selected, question.answers);
    else if (question.type === "matching") state.correct = isMatchingCorrect(state.connections, question.pairs.length);
    else state.correct = isOrderingCorrect(state.order);
    this.showQuestion(this.index);
  }

  private resetCurrent(): void {
    const question = this.quiz.questions[this.index]!;
    const state = this.states[this.index]!;
    this.states[this.index] = this.newState(question, state);
    this.showQuestion(this.index);
  }

  private resetAll(): void {
    this.states = this.quiz.questions.map((question) => this.newState(question));
    this.pager.removeClass("is-hidden");
    this.showQuestion(0);
  }

  private isReady(question: Question, state: QuestionState): boolean {
    if (question.type === "single" || question.type === "multiple") return state.selected.size > 0;
    if (question.type === "matching") return state.connections.size === question.pairs.length;
    return true;
  }

  private renderPager(): void {
    this.pager.removeClass("is-hidden");
    this.pager.empty();
    const previous = this.pager.createEl("button", { cls: "obquiz-previous", text: "‹ Previous" });
    previous.disabled = this.index === 0;
    previous.addEventListener("click", () => this.showQuestion(this.index - 1));
    this.pager.createDiv({ cls: "obquiz-progress", text: `Question ${this.index + 1} of ${this.quiz.questions.length}` });
    const isLast = this.index === this.quiz.questions.length - 1;
    const next = this.pager.createEl("button", { cls: "mod-cta obquiz-next", text: isLast ? "Finish" : "Next ›" });
    const state = this.states[this.index]!;
    next.disabled = !state.checked;
    next.addEventListener("click", () => isLast ? this.renderCompletion() : this.showQuestion(this.index + 1));
  }

  private renderCompletion(): void {
    this.matchingObserver?.disconnect();
    this.questionHost.empty();
    this.pager.addClass("is-hidden");
    const result = score(this.states.map((state) => state.correct));
    const completion = this.questionHost.createDiv({ cls: "obquiz-completion" });
    completion.createDiv({ cls: "obquiz-trophy", text: "🏆" });
    completion.createEl("h3", { text: "Quiz complete" });
    completion.createEl("p", { text: `You answered ${result.correct} of ${result.total} questions correctly.` });
    const ring = completion.createDiv({ cls: "obquiz-score-ring" });
    ring.style.setProperty("--obquiz-score", `${result.percentage * 3.6}deg`);
    ring.createSpan({ text: `${result.percentage}%` });
    completion.createEl("button", { cls: "mod-cta obquiz-reset-all", text: "↻ Try Again" })
      .addEventListener("click", () => this.resetAll());
  }

  private renderMarkdown(markdown: string, element: HTMLElement): void {
    void MarkdownRenderer.render(this.plugin.app, markdown, element, this.context.sourcePath, this.plugin);
  }
}
