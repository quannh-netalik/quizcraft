import type { QuestionType } from "./model";

export const QUIZCRAFT_CONFIG = {
  pluginId: "quizcraft",
  codeBlockLanguage: "quizcraft",
} as const;

export const QUESTION_TYPE_LABELS: Readonly<Record<QuestionType, string>> = {
  single: "Single Choice",
  multiple: "Multiple Choice",
  matching: "Matching",
  ordering: "Ordering",
};
