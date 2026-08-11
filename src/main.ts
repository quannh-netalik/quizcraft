import { Plugin, parseYaml } from "obsidian";
import { OBQUIZ_CONFIG } from "./config";
import { validateQuiz } from "./model";
import { QuizController } from "./quiz-controller";
import { QuizRenderChild } from "./quiz-render-child";

export default class ObquizPlugin extends Plugin {
  onload(): void {
    this.registerMarkdownCodeBlockProcessor(OBQUIZ_CONFIG.codeBlockLanguage, (source, element, context) => {
      try {
        const controller = new QuizController(this, validateQuiz(parseYaml(source)), element, context);
        context.addChild(new QuizRenderChild(element, controller));
        controller.render();
      } catch (error) {
        element.empty();
        const message = error instanceof Error ? error.message : String(error);
        element.createDiv({ cls: "obquiz-error", text: `Obquiz: ${message}` });
      }
    });
  }
}
