import type { MarkdownPostProcessorContext, Plugin } from "obsidian";
import { choiceQuiz } from "./choice";
import { quizCard } from "./quiz";

/** What a widget gets besides its callout element. */
export interface WidgetEnv {
  plugin: Plugin;
  ctx: MarkdownPostProcessorContext;
}

/**
 * One interactive widget. `selector` picks the callouts it owns; `setup` turns
 * one rendered callout into the widget. Setup must be idempotent: Obsidian
 * re-runs post-processors on the same element when a note re-renders.
 */
export interface Widget {
  name: string;
  selector: string;
  setup(callout: HTMLElement, env: WidgetEnv): void;
}

/** Widgets run in this order, so a widget may rely on the ones before it. */
export const WIDGETS: Widget[] = [quizCard, choiceQuiz];

/** `root` itself when it matches, otherwise every match below it. */
export function findAll(root: HTMLElement, selector: string): HTMLElement[] {
  if (root.matches(selector)) return [root];
  return [...root.querySelectorAll<HTMLElement>(selector)];
}

export function renderWidgets(root: HTMLElement, env: WidgetEnv, widgets: readonly Widget[] = WIDGETS): void {
  for (const widget of widgets) {
    for (const callout of findAll(root, widget.selector)) widget.setup(callout, env);
  }
}
