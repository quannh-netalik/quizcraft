import { MarkdownRenderer, Plugin } from "obsidian";
import type { MarkdownPostProcessorContext } from "obsidian";
import { QUESTION_TYPE_LABELS } from "./config";
import { score } from "./model";
import type { Question, Quiz } from "./model";
import { createChoiceInputName, createQuizInstanceId } from "./quiz-instance";
import type { QuizRenderChild } from "./quiz-render-child";
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
    private readonly renderChild: QuizRenderChild,
  ) {
    this.states = quiz.questions.map((question) => createQuestionState(question));
  }

  render(): void {
    this.root.empty();
    this.root.addClass("quizcraft");
    if (this.quiz.title) this.root.createEl("h3", { cls: "quizcraft-title", text: this.quiz.title });
    this.questionHost = this.root.createDiv({ cls: "quizcraft-question-host" });
    this.pager = this.root.createDiv({ cls: "quizcraft-pager" });
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
    const card = this.questionHost.createDiv({ cls: "quizcraft-question" });
    this.renderHeader(question, state, card);
    const prompt = card.createDiv({ cls: "quizcraft-prompt" });
    this.renderMarkdown(question.question, prompt);
    this.renderInteraction(question, state, card.createDiv({ cls: "quizcraft-interaction" }));
    this.renderQuestionOutcome(question, state, card);
    this.renderPager();
  }

  private renderHeader(question: Question, state: QuestionState, card: HTMLElement): void {
    const header = card.createDiv({ cls: "quizcraft-question-header" });
    const meta = header.createDiv({ cls: "quizcraft-question-meta" });
    meta.createSpan({ cls: "quizcraft-question-type", text: QUESTION_TYPE_LABELS[question.type] });
    if (state.checked) {
      meta.createSpan({
        cls: `quizcraft-status is-${state.correct ? "correct" : "incorrect"}`,
        text: state.correct ? "Correct" : "Incorrect",
      });
    }
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
    const checkButton = this.pager.querySelector<HTMLButtonElement>(".quizcraft-check");
    if (checkButton) checkButton.disabled = state.checked || !isQuestionReady(question, state);
  }

  private renderQuestionOutcome(question: Question, state: QuestionState, card: HTMLElement): void {
    if (state.checked && question.explanation) {
      const explanation = card.createDiv({ cls: "quizcraft-explanation" });
      explanation.createDiv({ cls: "quizcraft-explanation-label", text: "Explanation" });
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

    this.pager.createEl("button", {
      cls: "quizcraft-question-reset",
      text: "↻",
      attr: { "aria-label": "Reset this question" },
    }).addEventListener("click", () => this.resetCurrent());

    const navigation = this.pager.createDiv({ cls: "quizcraft-navigation" });
    const previous = navigation.createEl("button", {
      cls: "quizcraft-previous", text: "<", attr: { "aria-label": "Previous question" },
    });
    previous.disabled = this.index === 0;
    previous.addEventListener("click", () => this.showQuestion(this.index - 1));

    const progress = navigation.createDiv({
      cls: "quizcraft-progress",
      attr: { "aria-label": `Question ${this.index + 1} of ${this.quiz.questions.length}` },
    });
    progress.createSpan({ cls: "quizcraft-progress-current", text: `${this.index + 1}` });
    progress.createSpan({ cls: "quizcraft-progress-total", text: `/${this.quiz.questions.length}` });

    const isLast = this.index === this.quiz.questions.length - 1;
    const next = navigation.createEl("button", {
      cls: "quizcraft-next", text: ">", attr: { "aria-label": "Next question" },
    });
    next.disabled = !this.states[this.index]!.checked;
    next.addEventListener("click", () => isLast ? this.renderCompletion() : this.showQuestion(this.index + 1));

    const question = this.quiz.questions[this.index]!;
    const state = this.states[this.index]!;
    const check = this.pager.createEl("button", { text: "Check", cls: "mod-cta quizcraft-check" });
    check.disabled = state.checked || !isQuestionReady(question, state);
    check.addEventListener("click", () => this.checkCurrent());
  }

  private renderCompletion(): void {
    this.disposeRenderer();
    this.questionHost.empty();
    this.pager.addClass("is-hidden");
    const result = score(this.states.map((state) => state.correct));
    const completion = this.questionHost.createDiv({ cls: "quizcraft-completion" });
    completion.createDiv({ cls: "quizcraft-trophy", text: "🏆" });
    completion.createEl("h3", { text: "Quiz complete" });
    completion.createEl("p", { text: `You answered ${result.correct} of ${result.total} questions correctly.` });
    const ring = completion.createDiv({ cls: "quizcraft-score-ring" });
    ring.style.setProperty("--quizcraft-score", `${result.percentage * 3.6}deg`);
    ring.createSpan({ text: `${result.percentage}%` });
    completion.createEl("button", { cls: "mod-cta quizcraft-reset-all", text: "↻ Try Again" })
      .addEventListener("click", () => this.resetAll());
  }

  private disposeRenderer(): void {
    this.rendererCleanup?.();
    this.rendererCleanup = null;
  }

  private renderMarkdown(markdown: string, element: HTMLElement): void {
    void MarkdownRenderer.render(this.plugin.app, markdown, element, this.context.sourcePath, this.renderChild);
  }
}
