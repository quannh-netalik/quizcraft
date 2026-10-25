import { Plugin } from "obsidian";
import { QuizcraftSettingTab } from "./settings/setting-tab";
import { mergeSettings, type QuizcraftSettings } from "./settings/settings";
import { renderWidgets } from "./widgets/registry";

export default class QuizcraftPlugin extends Plugin {
  override settings: QuizcraftSettings = mergeSettings(undefined);

  override async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new QuizcraftSettingTab(this.app, this));
    // One post-processor for every widget; the registry decides which callouts to touch.
    this.registerMarkdownPostProcessor((el, ctx) => renderWidgets(el, { plugin: this, ctx, settings: this.settings }));
  }

  async loadSettings(): Promise<void> {
    this.settings = mergeSettings(await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
