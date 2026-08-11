import { choiceResult } from "../model";
import type { ChoiceQuestion } from "../model";
import type { QuestionState } from "../quiz-state";
import type { RendererContext } from "./contracts";

type ChoiceRendererContext = RendererContext & {
  inputName: string;
};

export function renderChoiceQuestion(
  question: ChoiceQuestion,
  state: QuestionState,
  context: ChoiceRendererContext,
): void {
  const options = context.host.createDiv({ cls: "obquiz-options" });
  const inputType = question.type === "single" ? "radio" : "checkbox";

  state.choiceOrder.forEach((optionIndex, displayIndex) => {
    const label = options.createEl("label", { cls: "obquiz-option" });
    if (state.checked) {
      const result = choiceResult(optionIndex, state.selected, question.answers);
      if (result) label.addClass(`is-${result}`);
    }

    const input = label.createEl("input");
    input.type = inputType;
    input.name = context.inputName;
    input.checked = state.selected.has(optionIndex);
    input.disabled = state.checked;
    label.createSpan({ cls: "obquiz-option-index", text: String.fromCharCode(65 + displayIndex) });
    const content = label.createDiv({ cls: "obquiz-option-content" });
    context.renderMarkdown(question.options[optionIndex]!, content);

    input.addEventListener("change", () => {
      if (question.type === "single") state.selected.clear();
      input.checked ? state.selected.add(optionIndex) : state.selected.delete(optionIndex);
      context.stateChanged();
    });
  });
}
