// Minimal stand-ins for the parts of the Obsidian API the plugin uses.
type PostProcessor = (el: HTMLElement, ctx: unknown) => void;

export class Plugin {
  readonly postProcessors: PostProcessor[] = [];

  registerMarkdownPostProcessor(processor: PostProcessor): void {
    this.postProcessors.push(processor);
  }

  data: unknown = null;
  readonly settingTabs: PluginSettingTab[] = [];
  constructor(
    readonly app: unknown = {},
    readonly manifest: unknown = {},
  ) {}

  addSettingTab(tab: PluginSettingTab): void {
    this.settingTabs.push(tab);
  }

  onload(): void | Promise<void> {}

  loadData(): Promise<unknown> {
    return Promise.resolve(this.data);
  }

  saveData(data: unknown): Promise<void> {
    this.data = data;
    return Promise.resolve();
  }
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

export class PluginSettingTab {
  readonly containerEl = document.createElement("div");
  constructor(
    readonly app: unknown,
    readonly plugin: Plugin,
  ) {}

  display(): void {}
}

/** Records name and toggle, so tests can flip a setting. */
export class Setting {
  name = "";
  toggle: { value: boolean; onChange: (value: boolean) => unknown } | undefined;
  constructor(readonly containerEl: HTMLElement) {}

  setName(name: string): this {
    this.name = name;
    return this;
  }

  setDesc(_desc: string): this {
    return this;
  }

  addToggle(cb: (toggle: { setValue(v: boolean): unknown; onChange(fn: (v: boolean) => unknown): unknown }) => void): this {
    const state = { value: false, onChange: (_v: boolean): unknown => undefined };
    const api = {
      setValue: (v: boolean) => {
        state.value = v;
        return api;
      },
      onChange: (fn: (v: boolean) => unknown) => {
        state.onChange = fn;
        return api;
      },
    };
    cb(api);
    this.toggle = state;
    return this;
  }
}
