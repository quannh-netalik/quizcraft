import { Plugin } from "obsidian";
import { renderWidgets } from "./widgets/registry";

export default class QuizcraftPlugin extends Plugin {
  override onload(): void {
    // One post-processor for every widget; the registry decides which callouts to touch.
    this.registerMarkdownPostProcessor((el, ctx) => renderWidgets(el, { plugin: this, ctx }));
  }
}
