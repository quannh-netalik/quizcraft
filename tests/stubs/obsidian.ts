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

  readonly commands: Command[] = [];
  addCommand(command: Command): Command {
    this.commands.push(command);
    return command;
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

export interface Command {
  id: string;
  name: string;
  callback?: () => unknown;
  checkCallback?: (checking: boolean) => boolean | void;
}

/** Obsidian parses YAML with its bundled parser; Bun's is close enough for tests. */
export function parseYaml(source: string): unknown {
  return Bun.YAML.parse(source);
}

/** Records every notice shown, for tests to read. */
export class Notice {
  static shown: string[] = [];
  constructor(message: string, _duration?: number) {
    Notice.shown.push(message);
  }
}

/** Opening a modal records it; tests call onOpen and click its buttons. */
export class Modal {
  static last: Modal | undefined;
  readonly titleEl = document.createElement("div");
  readonly contentEl = document.createElement("div");
  constructor(readonly app: unknown) {}
  open(): void {
    Modal.last = this;
    this.onOpen();
  }
  close(): void {
    this.onClose();
  }
  onOpen(): void {}
  onClose(): void {}
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

  addButton(cb: (button: ButtonStub) => void): this {
    const el = this.containerEl.createEl("button");
    const api: ButtonStub = {
      setButtonText: (text) => {
        el.textContent = text;
        return api;
      },
      setCta: () => api,
      onClick: (fn) => {
        el.addEventListener("click", fn);
        return api;
      },
    };
    cb(api);
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

interface ButtonStub {
  setButtonText(text: string): ButtonStub;
  setCta(): ButtonStub;
  onClick(fn: () => void): ButtonStub;
}
