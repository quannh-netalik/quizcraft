// Obsidian extends the DOM with helpers (createEl, createDiv, setText, …).
// The plugin uses them freely, so the tests install the same helpers on happy-dom.
interface ElOptions {
  cls?: string | string[];
  text?: string;
  attr?: Record<string, string | number | boolean | null>;
}

type Host = Node & ParentNode;

function build<K extends keyof HTMLElementTagNameMap>(tag: K, options?: ElOptions | string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  const o: ElOptions = typeof options === "string" ? { cls: options } : (options ?? {});
  if (o.cls) el.className = Array.isArray(o.cls) ? o.cls.join(" ") : o.cls;
  if (o.text !== undefined) el.textContent = o.text;
  for (const [name, value] of Object.entries(o.attr ?? {})) {
    if (value === null || value === false) continue;
    el.setAttribute(name, String(value));
  }
  return el;
}

const createEl = (tag: keyof HTMLElementTagNameMap, o?: ElOptions | string) => build(tag, o);

export function installObsidianDom(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  g.createEl = createEl;
  g.createDiv = (o?: ElOptions | string) => build("div", o);
  g.createSpan = (o?: ElOptions | string) => build("span", o);
  g.createFragment = (callback?: (f: DocumentFragment) => void) => {
    const f = document.createDocumentFragment();
    callback?.(f);
    return f;
  };

  const hosts = [window.HTMLElement.prototype, window.DocumentFragment.prototype] as unknown as Record<string, unknown>[];
  for (const proto of hosts) {
    proto.createEl = function (this: Host, tag: keyof HTMLElementTagNameMap, o?: ElOptions | string) {
      const el = build(tag, o);
      this.appendChild(el);
      return el;
    };
    proto.createDiv = function (this: Host, o?: ElOptions | string) {
      return (this as unknown as { createEl: typeof createEl }).createEl("div", o);
    };
    proto.createSpan = function (this: Host, o?: ElOptions | string) {
      return (this as unknown as { createEl: typeof createEl }).createEl("span", o);
    };
    proto.appendText = function (this: Host, text: string) {
      this.appendChild(document.createTextNode(text));
    };
    proto.empty = function (this: Host) {
      while (this.firstChild) this.removeChild(this.firstChild);
    };
    proto.setText = function (this: Host, text: string) {
      this.textContent = text;
    };
  }

  const el = window.HTMLElement.prototype as unknown as Record<string, unknown>;
  el.addClass = function (this: HTMLElement, ...names: string[]) {
    this.classList.add(...names);
  };
  el.removeClass = function (this: HTMLElement, ...names: string[]) {
    this.classList.remove(...names);
  };
  el.toggleClass = function (this: HTMLElement, name: string, on: boolean) {
    this.classList.toggle(name, on);
  };
  el.getAttr = function (this: HTMLElement, name: string) {
    return this.getAttribute(name);
  };
}
