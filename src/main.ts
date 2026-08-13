import { Plugin, parseYaml } from "obsidian";
import { QUIZCRAFT_CONFIG } from "./config";
import { validateQuiz } from "./model";
import { QuizController } from "./quiz-controller";
import { QuizRenderChild } from "./quiz-render-child";

export default class QuizcraftPlugin extends Plugin {
  onload(): void {
    this.registerMarkdownCodeBlockProcessor(QUIZCRAFT_CONFIG.codeBlockLanguage, (source, element, context) => {
      try {
        const renderChild = new QuizRenderChild(element);
        const controller = new QuizController(this, validateQuiz(parseYaml(source)), element, context, renderChild);
        renderChild.attach(controller);
        context.addChild(renderChild);
        controller.render();
      } catch (error) {
        element.empty();
        const message = error instanceof Error ? error.message : String(error);
        element.createDiv({ cls: "quizcraft-error", text: `Quizcraft: ${message}` });
      }
    });
  }
}
