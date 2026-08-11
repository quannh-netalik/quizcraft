import type { QuestionType } from "./model";

export const OBQUIZ_CONFIG = {
  pluginId: "obquiz",
  codeBlockLanguage: "obquiz",
} as const;

export const QUESTION_TYPE_LABELS: Readonly<Record<QuestionType, string>> = {
  single: "Single Choice",
  multiple: "Multiple Choice",
  matching: "Matching",
  ordering: "Ordering",
};
