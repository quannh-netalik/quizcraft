import type { Question } from "./model";
import {
  isChoiceCorrect,
  isMatchingCorrect,
  isOrderingCorrect,
  reshuffledOrder,
  shuffledIndices,
} from "./model";

export type QuestionState = {
  selected: Set<number>;
  choiceOrder: number[];
  connections: Map<number, number>;
  matchOrder: number[];
  order: number[];
  checked: boolean;
  correct: boolean;
};

export function createQuestionState(
  question: Question,
  previous?: QuestionState,
  random: () => number = Math.random,
): QuestionState {
  const choiceOrder = question.type === "single" || question.type === "multiple"
    ? previous ? reshuffledOrder(previous.choiceOrder, random) : shuffledIndices(question.options.length, random)
    : [];
  const matchOrder = question.type === "matching"
    ? previous ? reshuffledOrder(previous.matchOrder, random) : shuffledIndices(question.pairs.length, random)
    : [];
  const order = question.type === "ordering"
    ? previous ? reshuffledOrder(previous.order, random) : shuffledIndices(question.items.length, random)
    : [];

  return {
    selected: new Set(),
    choiceOrder,
    connections: new Map(),
    matchOrder,
    order,
    checked: false,
    correct: false,
  };
}

export function isQuestionReady(question: Question, state: QuestionState): boolean {
  if (question.type === "single" || question.type === "multiple") return state.selected.size > 0;
  if (question.type === "matching") return state.connections.size === question.pairs.length;
  return true;
}

export function evaluateQuestion(question: Question, state: QuestionState): boolean {
  if (question.type === "single" || question.type === "multiple") {
    return isChoiceCorrect(state.selected, question.answers);
  }
  if (question.type === "matching") return isMatchingCorrect(state.connections, question.pairs.length);
  return isOrderingCorrect(state.order);
}
