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

/** Records menu items, so tests can click one. */
export class MenuItem {
  title: string | DocumentFragment = "";
  checked = false;
  handler: () => void = () => {};

  setTitle(title: string | DocumentFragment): this {
    this.title = title;
    return this;
  }

  setChecked(checked: boolean): this {
    this.checked = checked;
    return this;
  }

  onClick(handler: () => void): this {
    this.handler = handler;
    return this;
  }
}

export class Menu {
  /** The last menu shown, for tests to inspect. */
  static last: Menu | undefined;
  readonly dom = document.createElement("div");
  readonly items: MenuItem[] = [];

  addItem(cb: (item: MenuItem) => void): this {
    const item = new MenuItem();
    cb(item);
    this.items.push(item);
    return this;
  }

  showAtPosition(_position: { x: number; y: number; width?: number }): this {
    Menu.last = this;
    return this;
  }
}
