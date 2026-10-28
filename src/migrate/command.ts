// Commands that rewrite 0.1.x `quizcraft` YAML blocks as [!quiz] callouts.
// The only code in the plugin that writes to a note, and only when the user asks.
import { type App, Modal, Notice, parseYaml, type Plugin, Setting, type TFile } from "obsidian";
import { convertNote, hasYamlQuiz } from "./yaml";

interface Tally {
  notes: number;
  blocks: number;
  failed: string[];
}

const reason = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Convert one note in place, adding what changed to `tally`. A note that
 * cannot be read or written is recorded as failed, so a vault run goes on.
 */
export async function convertFile(app: App, file: TFile, tally: Tally): Promise<void> {
  try {
    if (!hasYamlQuiz(await app.vault.cachedRead(file))) return;
    let blocks = 0;
    let failed: string[] = [];
    await app.vault.process(file, (text) => {
      const result = convertNote(text, parseYaml);
      blocks = result.converted;
      failed = result.failed;
      return result.text;
    });
    tally.failed.push(...failed.map((why) => `${file.path}: ${why}`));
    if (blocks) {
      tally.notes++;
      tally.blocks += blocks;
    }
  } catch (error) {
    tally.failed.push(`${file.path}: ${reason(error)}`);
  }
}

/** The notes that hold a YAML block; a note that cannot be read is skipped. */
async function notesWithYaml(app: App): Promise<TFile[]> {
  const out: TFile[] = [];
  for (const file of app.vault.getMarkdownFiles()) {
    const text = await app.vault.cachedRead(file).catch(() => "");
    if (hasYamlQuiz(text)) out.push(file);
  }
  return out;
}

const notify = (message: string, duration?: number): Notice => new Notice(message, duration);

function report(tally: Tally): void {
  const done = tally.blocks
    ? `Converted ${tally.blocks} YAML ${tally.blocks === 1 ? "quiz" : "quizzes"} in ${tally.notes} ${tally.notes === 1 ? "note" : "notes"}.`
    : "No YAML quizzes to convert.";
  if (!tally.failed.length) {
    notify(done);
    return;
  }
  // the failures go to the console too, where a long list can be read in full
  console.warn("Quizcraft: YAML quizzes left unchanged\n" + tally.failed.join("\n"));
  notify(`${done}\n${tally.failed.length} left unchanged:\n${tally.failed.slice(0, 3).join("\n")}`, 10_000);
}

/** Asks before rewriting every note in the vault. */
class ConfirmVaultModal extends Modal {
  constructor(
    app: App,
    private readonly count: number,
    private readonly run: () => void,
  ) {
    super(app);
  }

  override onOpen(): void {
    this.titleEl.setText("Convert YAML quizzes");
    this.contentEl.createEl("p", {
      text: `${this.count} ${this.count === 1 ? "note has" : "notes have"} quizcraft YAML blocks. Each block is replaced by [!quiz] callouts. Back up your vault first if it is not under version control.`,
    });
    new Setting(this.contentEl)
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((b) =>
        b
          .setButtonText("Convert")
          .setCta()
          .onClick(() => {
            this.close();
            this.run();
          }),
      );
  }

  override onClose(): void {
    this.contentEl.empty();
  }
}

export function registerMigrateCommands(plugin: Plugin): void {
  const { app } = plugin;
  plugin.addCommand({
    id: "convert-yaml-note",
    name: "Convert YAML quizzes in this note",
    checkCallback: (checking) => {
      const file = app.workspace.getActiveFile();
      if (file?.extension !== "md") return false;
      if (!checking) {
        const tally: Tally = { notes: 0, blocks: 0, failed: [] };
        void convertFile(app, file, tally).then(() => report(tally));
      }
      return true;
    },
  });
  plugin.addCommand({
    id: "convert-yaml-vault",
    name: "Convert YAML quizzes in all notes",
    callback: async () => {
      const files = await notesWithYaml(app);
      if (!files.length) {
        notify("No YAML quizzes to convert.");
        return;
      }
      new ConfirmVaultModal(app, files.length, () => {
        const tally: Tally = { notes: 0, blocks: 0, failed: [] };
        void (async () => {
          for (const file of files) await convertFile(app, file, tally);
          report(tally);
        })();
      }).open();
    },
  });
}
