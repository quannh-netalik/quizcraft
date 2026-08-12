import { MarkdownRenderChild } from "obsidian";
import type { QuizController } from "./quiz-controller";

export class QuizRenderChild extends MarkdownRenderChild {
  private controller: QuizController | null = null;

  attach(controller: QuizController): void {
    this.controller = controller;
  }

  onunload(): void {
    this.controller?.destroy();
    this.controller = null;
  }
}
