export type QuestionType = "single" | "multiple" | "matching" | "ordering";

type QuestionBase = { type: QuestionType; question: string; explanation: string | null };
export type ChoiceQuestion = QuestionBase & { type: "single" | "multiple"; options: string[]; answers: number[] };
export type MatchingQuestion = QuestionBase & { type: "matching"; pairs: [string, string][] };
export type OrderingQuestion = QuestionBase & { type: "ordering"; items: string[] };
export type Question = ChoiceQuestion | MatchingQuestion | OrderingQuestion;
export type Quiz = { title: string | null; questions: Question[] };

export class QuizValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuizValidationError";
  }
}

function fail(path: string, message: string): never {
  throw new QuizValidationError(path ? `${path}: ${message}` : message);
}

function mapping(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) fail(path, "must be a non-empty string");
  return value.trim();
}

function optionalExplanation(value: unknown, path: string): string | null {
  if (value == null) return null;
  if (typeof value !== "string") fail(path, "must be a string");
  return value;
}

function strings(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.length < 2 || value.some((item) => typeof item !== "string" || !item.trim())) {
    fail(path, "must contain at least two strings");
  }
  return [...value] as string[];
}

function validateQuestion(value: unknown, index: number): Question {
  const path = `questions[${index}]`;
  const input = mapping(value);
  if (!input) fail(path, "must be a YAML mapping");
  const type = input.type;
  if (type !== "single" && type !== "multiple" && type !== "matching" && type !== "ordering") {
    fail(path, `unsupported type ${String(type)}`);
  }
  const base = {
    type,
    question: text(input.question, `${path}.question`),
    explanation: optionalExplanation(input.explanation, `${path}.explanation`),
  };

  if (type === "single" || type === "multiple") {
    const options = strings(input.options, `${path}.options`);
    if (!Array.isArray(input.answers) || !input.answers.length || input.answers.some((answer) => !Number.isInteger(answer))) {
      fail(`${path}.answers`, "must contain one-based integer positions");
    }
    const answers = [...input.answers] as number[];
    if (type === "single" && answers.length !== 1) fail(`${path}.answers`, "single must contain exactly one answer");
    if (new Set(answers).size !== answers.length) fail(`${path}.answers`, "must not contain duplicates");
    for (const answer of answers) {
      if (answer < 1 || answer > options.length) fail(`${path}.answers`, `answer ${answer} is outside the option range`);
    }
    return { ...base, type, options, answers };
  }

  if (type === "matching") {
    if (!Array.isArray(input.pairs) || input.pairs.length < 2) fail(`${path}.pairs`, "must contain at least two pairs");
    const pairs = input.pairs.map((pair, pairIndex) => {
      if (!Array.isArray(pair) || pair.length !== 2 || pair.some((item) => typeof item !== "string" || !item.trim())) {
        fail(`${path}.pairs`, `pair ${pairIndex + 1} must contain exactly two strings`);
      }
      return [pair[0], pair[1]] as [string, string];
    });
    return { ...base, type, pairs };
  }

  return { ...base, type, items: strings(input.items, `${path}.items`) };
}

export function validateQuiz(value: unknown): Quiz {
  const input = mapping(value);
  if (!input) fail("", "Quiz must be a YAML mapping");
  if (!Array.isArray(input.questions) || !input.questions.length) fail("questions", "must contain at least one question");
  if (input.title != null && (typeof input.title !== "string" || !input.title.trim())) fail("title", "must be a non-empty string");
  return {
    title: input.title == null ? null : (input.title as string).trim(),
    questions: input.questions.map(validateQuestion),
  };
}

export function shuffledIndices(length: number, random: () => number = Math.random): number[] {
  const indices = Array.from({ length }, (_, index) => index);
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [indices[index], indices[swap]] = [indices[swap]!, indices[index]!];
  }
  if (length > 1 && indices.every((value, index) => value === index)) indices.reverse();
  return indices;
}

export function reshuffledOrder(order: number[], random: () => number = Math.random): number[] {
  const next = [...order];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [next[index], next[swap]] = [next[swap]!, next[index]!];
  }
  if (next.length > 1 && next.every((value, index) => value === order[index])) next.reverse();
  return next;
}

export const isChoiceCorrect = (selected: Set<number>, answers: number[]): boolean =>
  selected.size === answers.length && answers.every((answer) => selected.has(answer - 1));

export function connectPair(connections: Map<number, number>, prompt: number, match: number): Map<number, number> {
  const next = new Map(connections);
  next.delete(prompt);
  for (const [existingPrompt, existingMatch] of next) {
    if (existingMatch === match) next.delete(existingPrompt);
  }
  next.set(prompt, match);
  return next;
}

export type MatchingSelection = {
  connections: Map<number, number>;
  pendingPrompt: number | null;
  pendingMatch: number | null;
  action: "pending" | "connected" | "disconnected";
};

export function updateMatchingSelection(
  connections: Map<number, number>,
  pendingPrompt: number | null,
  pendingMatch: number | null,
  side: "prompt" | "match",
  index: number,
): MatchingSelection {
  const next = new Map(connections);

  if (side === "prompt") {
    if (pendingPrompt === index) {
      return { connections: next, pendingPrompt: null, pendingMatch, action: "pending" };
    }
    if (next.has(index)) {
      next.delete(index);
      return { connections: next, pendingPrompt: index, pendingMatch: null, action: "disconnected" };
    }
    if (pendingMatch !== null) {
      return { connections: connectPair(next, index, pendingMatch), pendingPrompt: null, pendingMatch: null, action: "connected" };
    }
    return { connections: next, pendingPrompt: index, pendingMatch: null, action: "pending" };
  }

  if (pendingMatch === index) {
    return { connections: next, pendingPrompt, pendingMatch: null, action: "pending" };
  }
  const connectedPrompt = [...next].find(([, match]) => match === index)?.[0];
  if (connectedPrompt !== undefined) {
    next.delete(connectedPrompt);
    return { connections: next, pendingPrompt: null, pendingMatch: index, action: "disconnected" };
  }
  if (pendingPrompt !== null) {
    return { connections: connectPair(next, pendingPrompt, index), pendingPrompt: null, pendingMatch: null, action: "connected" };
  }
  return { connections: next, pendingPrompt: null, pendingMatch: index, action: "pending" };
}

export function isMatchingCorrect(connections: Map<number, number>, count: number): boolean {
  return connections.size === count && Array.from({ length: count }, (_, index) => connections.get(index) === index).every(Boolean);
}

export const isOrderingCorrect = (order: number[]): boolean => order.every((value, index) => value === index);

export function moveItem(order: number[], from: number, to: number): number[] {
  if (from < 0 || to < 0 || from >= order.length || to >= order.length || from === to) return [...order];
  const next = [...order];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export type ItemResult = "correct" | "incorrect" | "missed" | null;

export function choiceResult(index: number, selected: Set<number>, answers: number[]): ItemResult {
  const isSelected = selected.has(index);
  const isCorrect = answers.includes(index + 1);
  if (isSelected && isCorrect) return "correct";
  if (isSelected) return "incorrect";
  if (isCorrect) return "missed";
  return null;
}

export const matchingResult = (promptIndex: number, matchIndex: number): "correct" | "incorrect" =>
  promptIndex === matchIndex ? "correct" : "incorrect";

export const orderingResult = (order: number[], position: number): "correct" | "incorrect" =>
  order[position] === position ? "correct" : "incorrect";

export function score(results: boolean[]): { correct: number; total: number; percentage: number } {
  const correct = results.filter(Boolean).length;
  const total = results.length;
  return { correct, total, percentage: total ? Math.round((correct / total) * 100) : 0 };
}
