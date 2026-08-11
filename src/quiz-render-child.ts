import { MarkdownRenderChild } from "obsidian";
import type { QuizController } from "./quiz-controller";

export class QuizRenderChild extends MarkdownRenderChild {
  constructor(containerEl: HTMLElement, private readonly controller: QuizController) {
    super(containerEl);
  }

  onunload(): void {
    this.controller.destroy();
  }
}
