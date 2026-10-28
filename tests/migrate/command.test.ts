import { beforeEach, expect, test } from "bun:test";
import { Modal, Notice } from "../stubs/obsidian";
import QuizcraftPlugin from "../../src/main";
import { click } from "../helpers/dom";

interface FakeFile {
  path: string;
  extension: string;
}

const YAML = "```quizcraft\nquestions:\n  - {type: single, question: Q?, options: [a, b], answers: [1]}\n```";

/** A vault of in-memory notes and a plugin wired to it. */
async function setup(notes: Record<string, string>, active?: string, broken: string[] = []) {
  const files: FakeFile[] = Object.keys(notes).map((path) => ({ path, extension: "md" }));
  const vault = {
    getMarkdownFiles: () => files,
    cachedRead: (f: FakeFile) => Promise.resolve(notes[f.path] ?? ""),
    process: (f: FakeFile, fn: (text: string) => string) => {
      if (broken.includes(f.path)) return Promise.reject(new Error("file is locked"));
      notes[f.path] = fn(notes[f.path] ?? "");
      return Promise.resolve(notes[f.path]);
    },
  };
  const app = { vault, workspace: { getActiveFile: () => files.find((f) => f.path === active) ?? null } };
  const plugin = new QuizcraftPlugin(app as never, {} as never);
  await plugin.onload();
  const commands = (plugin as unknown as { commands: { id: string; callback?: () => unknown; checkCallback?: (c: boolean) => unknown }[] })
    .commands;
  const command = (id: string) => commands.find((c) => c.id === id)!;
  return { notes, command };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  Notice.shown = [];
  Modal.last = undefined;
});

test("the note command converts the active note only", async () => {
  const { notes, command } = await setup({ "a.md": YAML, "b.md": YAML }, "a.md");
  expect(command("convert-yaml-note").checkCallback!(true)).toBe(true);
  command("convert-yaml-note").checkCallback!(false);
  await settle();
  expect(notes["a.md"]).toStartWith("> [!quiz] Question 1");
  expect(notes["b.md"]).toBe(YAML);
  expect(Notice.shown).toEqual(["Converted 1 YAML quiz in 1 note."]);
});

test("the note command is hidden without an active note", async () => {
  const { command } = await setup({ "a.md": YAML });
  expect(command("convert-yaml-note").checkCallback!(true)).toBe(false);
});

test("the vault command asks first, then converts every note with a block", async () => {
  const { notes, command } = await setup({ "a.md": YAML, "b.md": "plain", "c.md": `${YAML}\n\n${YAML}` });
  await command("convert-yaml-vault").callback!();
  expect(Modal.last?.contentEl.textContent).toContain("2 notes have quizcraft YAML blocks");
  expect(notes["a.md"]).toBe(YAML);
  const buttons = [...Modal.last!.contentEl.querySelectorAll("button")];
  click(buttons.find((b) => b.textContent === "Convert")!);
  await settle();
  expect(notes["a.md"]).not.toContain("```");
  expect(notes["c.md"]).not.toContain("```");
  expect(notes["b.md"]).toBe("plain");
  expect(Notice.shown).toEqual(["Converted 3 YAML quizzes in 2 notes."]);
});

test("cancel leaves the vault alone", async () => {
  const { notes, command } = await setup({ "a.md": YAML });
  await command("convert-yaml-vault").callback!();
  click([...Modal.last!.contentEl.querySelectorAll("button")].find((b) => b.textContent === "Cancel")!);
  await settle();
  expect(notes["a.md"]).toBe(YAML);
  expect(Notice.shown).toEqual([]);
});

test("a vault without YAML blocks says so without asking", async () => {
  const { command } = await setup({ "a.md": "plain" });
  await command("convert-yaml-vault").callback!();
  expect(Modal.last).toBeUndefined();
  expect(Notice.shown).toEqual(["No YAML quizzes to convert."]);
});

test("blocks that fail are listed and stay in the note", async () => {
  const bad = "```quizcraft\nquestions: []\n```";
  const { notes, command } = await setup({ "a.md": bad }, "a.md");
  const warn = console.warn;
  console.warn = () => {};
  command("convert-yaml-note").checkCallback!(false);
  await settle();
  console.warn = warn;
  expect(notes["a.md"]).toBe(bad);
  expect(Notice.shown[0]).toBe("No YAML quizzes to convert.\n1 left unchanged:\na.md: questions needs at least 1 items");
});

test("a note that cannot be written is reported and the rest still convert", async () => {
  const { notes, command } = await setup({ "a.md": YAML, "b.md": YAML }, undefined, ["a.md"]);
  const warn = console.warn;
  console.warn = () => {};
  await command("convert-yaml-vault").callback!();
  click([...Modal.last!.contentEl.querySelectorAll("button")].find((b) => b.textContent === "Convert")!);
  await settle();
  console.warn = warn;
  expect(notes["a.md"]).toBe(YAML);
  expect(notes["b.md"]).toStartWith("> [!quiz]");
  expect(Notice.shown[0]).toBe("Converted 1 YAML quiz in 1 note.\n1 left unchanged:\na.md: file is locked");
});
