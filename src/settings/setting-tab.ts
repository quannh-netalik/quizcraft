import { type App, PluginSettingTab, Setting } from "obsidian";
import type QuizcraftPlugin from "../main";

/** Settings → Quizcraft. Changes apply to notes rendered after the change. */
export class QuizcraftSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: QuizcraftPlugin,
  ) {
    super(app, plugin);
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const { settings } = this.plugin;

    new Setting(containerEl)
      .setName("Shuffle quiz options")
      .setDesc(
        "Deal multiple-choice options in random order. Quizzes whose options refer to each other " +
          '("all of the above", "A and B") always keep their order.',
      )
      .addToggle((toggle) =>
        toggle.setValue(settings.shuffleOptions).onChange(async (value) => {
          settings.shuffleOptions = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Remember code language")
      .setDesc("Open code editors on the language you picked last, in every note and after a restart.")
      .addToggle((toggle) =>
        toggle.setValue(settings.rememberLanguage).onChange(async (value) => {
          settings.rememberLanguage = value;
          await this.plugin.saveSettings();
        }),
      );
  }
}
