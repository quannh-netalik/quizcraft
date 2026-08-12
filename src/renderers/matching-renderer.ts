import { matchingResult, updateMatchingSelection } from "../model";
import type { MatchingQuestion } from "../model";
import type { QuestionState } from "../quiz-state";
import type { RendererCleanup, RendererContext } from "./contracts";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export function createMatchCurve(x1: number, y1: number, x2: number, y2: number) {
  const bend = Math.max(36, (x2 - x1) * 0.45);
  const verticalApproach = Math.max(-bend, Math.min(bend, (y1 - y2) * 0.25));
  return {
    x1,
    y1,
    control1X: x1 + bend,
    control1Y: y1,
    control2X: x2 - bend,
    control2Y: y2 + verticalApproach,
    x2,
    y2,
    bend,
  };
}

export function hasCardTextSelection(
  card: HTMLElement,
  selection: Selection | null = document.getSelection(),
): boolean {
  if (!selection || selection.isCollapsed || !selection.anchorNode || !selection.focusNode) return false;
  return card.contains(selection.anchorNode) && card.contains(selection.focusNode);
}

export function renderMatchingQuestion(
  question: MatchingQuestion,
  state: QuestionState,
  context: RendererContext,
): RendererCleanup {
  const matching = context.host.createDiv({ cls: "obquiz-matching" });
  const lines = document.createElementNS(SVG_NAMESPACE, "svg");
  lines.classList.add("obquiz-match-lines");
  lines.setAttribute("aria-hidden", "true");
  matching.appendChild(lines);
  const leftColumn = matching.createDiv({ cls: "obquiz-match-column" });
  const rightColumn = matching.createDiv({ cls: "obquiz-match-column" });
  let pendingPrompt: number | null = null;
  let pendingMatch: number | null = null;

  const drawLines = (): void => {
    lines.replaceChildren(createMatchDefinitions());
    const bounds = matching.getBoundingClientRect();
    lines.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
    for (const [promptIndex, matchIndex] of state.connections) {
      const from = matching.querySelector<HTMLElement>(`[data-obquiz-port="prompt-${promptIndex}"]`);
      const to = matching.querySelector<HTMLElement>(`[data-obquiz-port="match-${matchIndex}"]`);
      if (!from || !to) continue;
      const start = from.getBoundingClientRect();
      const end = to.getBoundingClientRect();
      const x1 = start.left + start.width / 2 - bounds.left;
      const y1 = start.top + start.height / 2 - bounds.top;
      const x2 = end.left + end.width / 2 - bounds.left;
      const y2 = end.top + end.height / 2 - bounds.top;
      const curve = createMatchCurve(x1, y1, x2, y2);
      const result = state.checked ? matchingResult(promptIndex, matchIndex) : "pending";
      const path = document.createElementNS(SVG_NAMESPACE, "path");
      path.setAttribute("class", `obquiz-match-line is-${result}`);
      path.setAttribute("d", `M ${curve.x1} ${curve.y1} C ${curve.control1X} ${curve.control1Y}, ${curve.control2X} ${curve.control2Y}, ${curve.x2} ${curve.y2}`);
      path.setAttribute("marker-end", `url(#obquiz-arrow-${result})`);
      lines.appendChild(path);
    }
  };

  const markPending = (): void => {
    matching.querySelectorAll(".is-pending").forEach((element) => element.classList.remove("is-pending"));
    if (pendingPrompt !== null) matching.querySelector(`[data-prompt="${pendingPrompt}"]`)?.classList.add("is-pending");
    if (pendingMatch !== null) matching.querySelector(`[data-match="${pendingMatch}"]`)?.classList.add("is-pending");
    drawLines();
  };

  const refreshMatchingState = (): void => {
    const connectedMatches = new Set(state.connections.values());
    matching.querySelectorAll<HTMLElement>("[data-prompt]").forEach((card) => {
      const promptIndex = Number(card.dataset.prompt);
      card.toggleClass("is-connected", state.connections.has(promptIndex));
      card.toggleClass("is-unconnected", state.connections.size > 0 && !state.connections.has(promptIndex));
    });
    matching.querySelectorAll<HTMLElement>("[data-match]").forEach((card) => {
      const matchIndex = Number(card.dataset.match);
      const isConnected = connectedMatches.has(matchIndex);
      card.toggleClass("is-connected", isConnected);
      card.toggleClass("is-unconnected", state.connections.size > 0 && !isConnected);
    });
    markPending();
  };

  const select = (side: "prompt" | "match", index: number): void => {
    if (state.checked) return;
    const selection = updateMatchingSelection(state.connections, pendingPrompt, pendingMatch, side, index);
    state.connections = selection.connections;
    pendingPrompt = selection.pendingPrompt;
    pendingMatch = selection.pendingMatch;
    refreshMatchingState();
    if (selection.action !== "pending") context.stateChanged();
  };

  state.promptOrder.forEach((promptIndex) => {
    const prompt = question.pairs[promptIndex]![0];
    const matchIndex = state.connections.get(promptIndex);
    const result = state.checked && matchIndex !== undefined ? matchingResult(promptIndex, matchIndex) : null;
    const card = createMatchCard(prompt, leftColumn, context.renderMarkdown, () => select("prompt", promptIndex), result);
    card.dataset.prompt = String(promptIndex);
    card.toggleClass("is-connected", matchIndex !== undefined && !state.checked);
    card.toggleClass("is-unconnected", state.connections.size > 0 && matchIndex === undefined);
    card.append(createMatchPort(`prompt-${promptIndex}`));
    card.disabled = state.checked;
  });

  const promptByMatch = new Map(Array.from(state.connections, ([prompt, match]) => [match, prompt]));
  state.matchOrder.forEach((matchIndex) => {
    const promptIndex = promptByMatch.get(matchIndex);
    const result = state.checked && promptIndex !== undefined ? matchingResult(promptIndex, matchIndex) : null;
    const card = createMatchCard(question.pairs[matchIndex]![1], rightColumn, context.renderMarkdown, () => select("match", matchIndex), result);
    card.dataset.match = String(matchIndex);
    card.toggleClass("is-connected", promptIndex !== undefined && !state.checked);
    card.toggleClass("is-unconnected", state.connections.size > 0 && promptIndex === undefined);
    card.prepend(createMatchPort(`match-${matchIndex}`));
    card.disabled = state.checked;
  });

  const initialDrawFrame = requestAnimationFrame(drawLines);
  const observer = new ResizeObserver(drawLines);
  observer.observe(matching);
  return () => {
    cancelAnimationFrame(initialDrawFrame);
    observer.disconnect();
  };
}

function createMatchPort(name: string): HTMLSpanElement {
  const port = document.createElement("span");
  port.className = "obquiz-match-port";
  port.dataset.obquizPort = name;
  port.setAttribute("data-obquiz-port", name);
  port.setAttribute("aria-hidden", "true");
  return port;
}

function createMatchDefinitions(): SVGDefsElement {
  const definitions = document.createElementNS(SVG_NAMESPACE, "defs");
  for (const state of ["pending", "correct", "incorrect"]) {
    const marker = document.createElementNS(SVG_NAMESPACE, "marker");
    marker.id = `obquiz-arrow-${state}`;
    marker.setAttribute("markerWidth", "6");
    marker.setAttribute("markerHeight", "6");
    marker.setAttribute("refX", "6");
    marker.setAttribute("refY", "3");
    marker.setAttribute("orient", "auto");
    const arrow = document.createElementNS(SVG_NAMESPACE, "path");
    arrow.setAttribute("d", "M 0 0 L 6 3 L 0 6 Z");
    arrow.setAttribute("class", `is-${state}`);
    marker.appendChild(arrow);
    definitions.appendChild(marker);
  }
  return definitions;
}

function createMatchCard(
  markdown: string,
  host: HTMLElement,
  renderMarkdown: RendererContext["renderMarkdown"],
  action: () => void,
  result: "correct" | "incorrect" | null,
): HTMLButtonElement {
  const button = host.createEl("button", { cls: "obquiz-match-card" });
  if (result) button.addClass(`is-${result}`);
  const content = button.createDiv({ cls: "obquiz-match-content" });
  renderMarkdown(markdown, content);
  button.addEventListener("click", (event) => {
    if (event.detail > 0 && hasCardTextSelection(button)) return;
    action();
  });
  return button;
}
