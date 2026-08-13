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
  const options = context.host.createDiv({ cls: "quizcraft-options" });
  const inputType = question.type === "single" ? "radio" : "checkbox";
  const updateOptionClasses: Array<() => void> = [];

  state.choiceOrder.forEach((optionIndex, displayIndex) => {
    const label = options.createEl("label", { cls: "quizcraft-option" });
    if (state.checked) {
      const result = choiceResult(optionIndex, state.selected, question.answers);
      if (result) label.addClass(`is-${result}`);
    }

    const input = label.createEl("input");
    input.type = inputType;
    input.name = context.inputName;
    input.checked = state.selected.has(optionIndex);
    input.disabled = state.checked;
    const updateClasses = (): void => {
      if (question.type === "single") input.checked = state.selected.has(optionIndex);
      label.toggleClass("is-selected", input.checked);
      label.toggleClass("is-disabled", input.disabled);
    };
    updateOptionClasses.push(updateClasses);
    updateClasses();
    label.createSpan({ cls: "quizcraft-option-index", text: String.fromCharCode(65 + displayIndex) });
    const content = label.createDiv({ cls: "quizcraft-option-content" });
    context.renderMarkdown(question.options[optionIndex]!, content);

    input.addEventListener("focus", () => {
      label.toggleClass("has-focus-visible", input.matches(":focus-visible"));
    });
    input.addEventListener("blur", () => label.removeClass("has-focus-visible"));
    input.addEventListener("change", () => {
      if (question.type === "single") state.selected.clear();
      input.checked ? state.selected.add(optionIndex) : state.selected.delete(optionIndex);
      updateOptionClasses.forEach((updateOptionClass) => updateOptionClass());
      context.stateChanged();
    });
  });
}
