// Minimal stand-ins for the parts of the Obsidian API the plugin uses.
type PostProcessor = (el: HTMLElement, ctx: unknown) => void;

export class Plugin {
  readonly postProcessors: PostProcessor[] = [];

  registerMarkdownPostProcessor(processor: PostProcessor): void {
    this.postProcessors.push(processor);
  }

  onload(): void {}
}

export function setIcon(el: HTMLElement, name: string): void {
  el.dataset.icon = name;
}
