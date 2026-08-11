import { MarkdownRenderer, Plugin } from "obsidian";
import type { MarkdownPostProcessorContext } from "obsidian";
import { QUESTION_TYPE_LABELS } from "./config";
import { score } from "./model";
import type { Question, Quiz } from "./model";
import { createChoiceInputName, createQuizInstanceId } from "./quiz-instance";
import {
  createQuestionState,
  evaluateQuestion,
  isQuestionReady,
} from "./quiz-state";
import type { QuestionState } from "./quiz-state";
import { renderChoiceQuestion } from "./renderers/choice-renderer";
import type { RendererCleanup, RendererContext } from "./renderers/contracts";
import { renderMatchingQuestion } from "./renderers/matching-renderer";
import { renderOrderingQuestion } from "./renderers/ordering-renderer";

export class QuizController {
  private readonly instanceId = createQuizInstanceId();
  private index = 0;
  private states: QuestionState[];
  private questionHost!: HTMLElement;
  private pager!: HTMLElement;
  private rendererCleanup: RendererCleanup | null = null;

  constructor(
    private readonly plugin: Plugin,
    private readonly quiz: Quiz,
    private readonly root: HTMLElement,
    private readonly context: MarkdownPostProcessorContext,
  ) {
    this.states = quiz.questions.map((question) => createQuestionState(question));
  }

  render(): void {
    this.root.empty();
    this.root.addClass("obquiz");
    if (this.quiz.title) this.root.createEl("h3", { cls: "obquiz-title", text: this.quiz.title });
    this.questionHost = this.root.createDiv({ cls: "obquiz-question-host" });
    this.pager = this.root.createDiv({ cls: "obquiz-pager" });
    this.showQuestion(0);
  }

  destroy(): void {
    this.disposeRenderer();
  }

  private showQuestion(index: number): void {
    this.disposeRenderer();
    this.index = index;
    this.questionHost.empty();
    const question = this.quiz.questions[index]!;
    const state = this.states[index]!;
    const card = this.questionHost.createDiv({ cls: "obquiz-question" });
    this.renderHeader(question, state, card);
    const prompt = card.createDiv({ cls: "obquiz-prompt" });
    this.renderMarkdown(question.question, prompt);
    this.renderInteraction(question, state, card.createDiv({ cls: "obquiz-interaction" }));
    this.renderQuestionOutcome(question, state, card);
    this.renderPager();
  }

  private renderHeader(question: Question, state: QuestionState, card: HTMLElement): void {
    const header = card.createDiv({ cls: "obquiz-question-header" });
    const meta = header.createDiv({ cls: "obquiz-question-meta" });
    meta.createSpan({ cls: "obquiz-question-type", text: QUESTION_TYPE_LABELS[question.type] });
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
  }

  private renderInteraction(question: Question, state: QuestionState, host: HTMLElement): void {
    const rendererContext: RendererContext = {
      host,
      renderMarkdown: (markdown, element) => this.renderMarkdown(markdown, element),
      stateChanged: () => this.updateCheckButton(question, state),
      rerender: () => this.showQuestion(this.index),
    };

    switch (question.type) {
      case "single":
      case "multiple":
        renderChoiceQuestion(question, state, {
          ...rendererContext,
          inputName: createChoiceInputName(this.instanceId, this.index),
        });
        break;
      case "matching":
        this.rendererCleanup = renderMatchingQuestion(question, state, rendererContext);
        break;
      case "ordering":
        this.rendererCleanup = renderOrderingQuestion(question, state, rendererContext);
        break;
    }
  }

  private updateCheckButton(question: Question, state: QuestionState): void {
    const checkButton = this.questionHost.querySelector<HTMLButtonElement>(".obquiz-check");
    if (checkButton) checkButton.disabled = !isQuestionReady(question, state);
  }

  private renderQuestionOutcome(question: Question, state: QuestionState, card: HTMLElement): void {
    if (!state.checked) {
      const actions = card.createDiv({ cls: "obquiz-actions" });
      const check = actions.createEl("button", { text: "Check Answer", cls: "mod-cta obquiz-check" });
      check.disabled = !isQuestionReady(question, state);
      check.addEventListener("click", () => this.checkCurrent());
      return;
    }
    if (question.explanation) {
      const explanation = card.createDiv({ cls: "obquiz-explanation" });
      this.renderMarkdown(question.explanation, explanation);
    }
  }

  private checkCurrent(): void {
    const question = this.quiz.questions[this.index]!;
    const state = this.states[this.index]!;
    if (!isQuestionReady(question, state)) return;
    state.checked = true;
    state.correct = evaluateQuestion(question, state);
    this.showQuestion(this.index);
  }

  private resetCurrent(): void {
    const question = this.quiz.questions[this.index]!;
    const state = this.states[this.index]!;
    this.states[this.index] = createQuestionState(question, state);
    this.showQuestion(this.index);
  }

  private resetAll(): void {
    this.states = this.quiz.questions.map((question) => createQuestionState(question));
    this.pager.removeClass("is-hidden");
    this.showQuestion(0);
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
    next.disabled = !this.states[this.index]!.checked;
    next.addEventListener("click", () => isLast ? this.renderCompletion() : this.showQuestion(this.index + 1));
  }

  private renderCompletion(): void {
    this.disposeRenderer();
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

  private disposeRenderer(): void {
    this.rendererCleanup?.();
    this.rendererCleanup = null;
  }

  private renderMarkdown(markdown: string, element: HTMLElement): void {
    void MarkdownRenderer.render(this.plugin.app, markdown, element, this.context.sourcePath, this.plugin);
  }
}
