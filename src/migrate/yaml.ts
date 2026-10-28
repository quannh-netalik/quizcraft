// Convert the 0.1.x `quizcraft` YAML code block into [!quiz] callouts.
// Pure text in, text out: the caller passes the YAML parser (Obsidian's
// parseYaml) and decides when to write the result back.

export type ParseYaml = (source: string) => unknown;

/** Why a block was left as it is. */
export class ConvertError extends Error {}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

type Record_ = Record<string, unknown>;

const isRecord = (v: unknown): v is Record_ => typeof v === "object" && v !== null && !Array.isArray(v);

/** One line of text: YAML scalars may be numbers, and a list item is one line. */
function line(v: unknown, what: string): string {
  if (typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean") {
    throw new ConvertError(`${what} is not text`);
  }
  const text = String(v).replaceAll(/\s*\n\s*/g, " ").trim();
  if (!text) throw new ConvertError(`${what} is empty`);
  return text;
}

/** Markdown text that may span lines (question, explanation). */
function block(v: unknown, what: string): string[] {
  if (typeof v !== "string" && typeof v !== "number") throw new ConvertError(`${what} is not text`);
  const lines = String(v).trim().split("\n");
  if (!lines.join("").trim()) throw new ConvertError(`${what} is empty`);
  return lines.map((l) => l.trimEnd());
}

function list(v: unknown, what: string, min = 2): unknown[] {
  if (!Array.isArray(v) || v.length < min) throw new ConvertError(`${what} needs at least ${min} items`);
  return v;
}

/** Answer positions are one-based, into the authored options. */
function answerLetters(v: unknown, count: number, single: boolean): string[] {
  const picks = list(v, "answers", 1);
  const out: string[] = [];
  for (const p of picks) {
    if (typeof p !== "number" || !Number.isInteger(p) || p < 1 || p > count) {
      throw new ConvertError(`answer ${String(p)} is not an option number from 1 to ${count}`);
    }
    const letter = LETTERS[p - 1] ?? "";
    if (!out.includes(letter)) out.push(letter);
  }
  if (single && out.length !== 1) throw new ConvertError("a single question needs exactly one answer");
  return out;
}

// A list whose markdown order is not the answer order, so the note does not
// give the answer away where the plugin is off. Reversed order is never the
// key order for two or more distinct items.
const reversed = <T>(items: readonly T[]): T[] => items.map((_, i) => items[items.length - 1 - i] as T);

function choiceLines(q: Record_, multi: boolean): { question: string[]; answer: string[] } {
  const options = list(q.options, "options").map((o, i) => line(o, `option ${i + 1}`));
  if (options.length > LETTERS.length) throw new ConvertError(`more than ${LETTERS.length} options`);
  const keys = answerLetters(q.answers, options.length, !multi);
  const question = block(q.question, "question");
  // one right option on a multiple question: the hint keeps it a checkbox quiz
  if (multi && keys.length === 1) question.push("*(Multi-select)*");
  return {
    question: [...question, ...options.map((o, i) => `- ${LETTERS[i]}) ${o}`)],
    answer: keys.flatMap((k, i) => [...(i ? [""] : []), `**${k})** ${options[LETTERS.indexOf(k)] ?? ""}`]),
  };
}

function orderLines(q: Record_): { question: string[]; answer: string[] } {
  const items = list(q.items, "items").map((o, i) => line(o, `item ${i + 1}`));
  if (new Set(items).size !== items.length) throw new ConvertError("ordering items must differ");
  return {
    question: [...block(q.question, "question"), ...reversed(items).map((s) => `- ${s}`)],
    answer: items.map((s, i) => `${i + 1}. ${s}`),
  };
}

function matchLines(q: Record_): { question: string[]; answer: string[] } {
  const pairs = list(q.pairs, "pairs").map((p, i) => {
    if (!Array.isArray(p) || p.length !== 2) throw new ConvertError(`pair ${i + 1} needs two items`);
    return [line(p[0], `pair ${i + 1}`), line(p[1], `pair ${i + 1}`)] as const;
  });
  // choices listed alphabetically, not in key order
  // oxlint-disable-next-line unicorn/no-array-sort
  const choices = pairs.map(([, r]) => r).sort((a, b) => a.localeCompare(b));
  return {
    question: [
      ...block(q.question, "question"),
      "",
      "**Item**",
      ...pairs.map(([l]) => `- ${l}`),
      "",
      "**Match**",
      ...choices.map((r) => `- ${r}`),
    ],
    answer: pairs.map(([l, r]) => `- ${l} → **${r}**`),
  };
}

function questionCallout(q: unknown, title: string): string[] {
  if (!isRecord(q)) throw new ConvertError("a question is not a mapping");
  const type = q.type;
  const parts =
    type === "single" || type === "multiple"
      ? choiceLines(q, type === "multiple")
      : type === "ordering"
        ? orderLines(q)
        : type === "matching"
          ? matchLines(q)
          : undefined;
  if (!parts) throw new ConvertError(`unknown question type ${JSON.stringify(type)}`);
  const kind = type === "ordering" ? "|order" : type === "matching" ? "|match" : "";
  const body = [...parts.question, "", "==Answer==", "", ...parts.answer];
  if (q.explanation !== undefined && q.explanation !== null) body.push("", ...block(q.explanation, "explanation"));
  return [`> [!quiz${kind}] ${title}`, ...body.map((l) => (l ? `> ${l}` : ">"))];
}

/** Markdown for one YAML block: one callout per question, a blank line apart. */
export function convertQuiz(source: string, parse: ParseYaml): string {
  let data: unknown;
  try {
    data = parse(source);
  } catch (error) {
    throw new ConvertError(`invalid YAML (${error instanceof Error ? error.message : String(error)})`, { cause: error });
  }
  if (!isRecord(data)) throw new ConvertError("the block is not a mapping");
  const questions = list(data.questions, "questions", 1);
  const title = data.title === undefined || data.title === null ? "" : line(data.title, "title");
  // a one-question quiz takes the quiz title; a set keeps it as a bold line above
  const one = questions.length === 1 && title;
  const out: string[] = one || !title ? [] : [`**${title}**`, ""];
  for (const [i, q] of questions.entries()) {
    if (i) out.push("");
    out.push(...questionCallout(q, one ? title : `Question ${i + 1}`));
  }
  return out.join("\n");
}

export interface NoteResult {
  text: string;
  converted: number;
  /** One reason per block left unchanged. */
  failed: string[];
}

const FENCE_RE = /^([ \t]*)(`{3,}|~{3,})[ \t]*quizcraft[ \t]*$/;

/** Replace every top-level ```quizcraft block in a note; blocks that fail stay. */
export function convertNote(text: string, parse: ParseYaml): NoteResult {
  const lines = text.split("\n");
  const out: string[] = [];
  const failed: string[] = [];
  let converted = 0;
  for (let i = 0; i < lines.length; i++) {
    const open = FENCE_RE.exec(lines[i] ?? "");
    if (!open) {
      out.push(lines[i] ?? "");
      continue;
    }
    const [, indent = "", fence = ""] = open;
    const close = new RegExp(`^[ \\t]*${fence[0] === "`" ? "`" : "~"}{${fence.length},}[ \\t]*$`);
    let end = i + 1;
    while (end < lines.length && !close.test(lines[end] ?? "")) end++;
    if (end >= lines.length) {
      // unclosed fence: leave the rest of the note alone
      out.push(...lines.slice(i));
      failed.push("a quizcraft block has no closing fence");
      break;
    }
    const source = lines
      .slice(i + 1, end)
      .map((l) => (l.startsWith(indent) ? l.slice(indent.length) : l))
      .join("\n");
    try {
      out.push(...convertQuiz(source, parse).split("\n").map((l) => (l ? indent + l : l)));
      converted++;
    } catch (error) {
      if (!(error instanceof ConvertError)) throw error;
      failed.push(error.message);
      out.push(...lines.slice(i, end + 1));
    }
    i = end;
  }
  return { text: out.join("\n"), converted, failed };
}

/** Cheap test before reading a note in full. */
export const hasYamlQuiz = (text: string): boolean => /^[ \t]*(`{3,}|~{3,})[ \t]*quizcraft[ \t]*$/m.test(text);
