import { setIcon } from "obsidian";
import { guard } from "../../lib/dom";

/** The visible name of a nested callout: its title text. */
export function calloutName(el: HTMLElement, fallback: string): string {
  return el.querySelector(":scope > .callout-title .callout-title-inner")?.textContent?.trim() || fallback;
}

/**
 * `> [!code]` with no caption renders Obsidian's default title "Code". Such a
 * title says nothing, so the box gets .eq-notitle and the CSS hides it.
 */
export function markDefaultTitle(box: HTMLElement): void {
  const title = box.querySelector(":scope > .callout-title .callout-title-inner")?.textContent?.trim().toLowerCase();
  if (title && title === box.dataset.callout) box.classList.add("eq-notitle");
}

export interface Tab {
  name: string;
  panel: HTMLElement;
  btn: HTMLButtonElement;
}

export interface TabBar {
  tabs: Tab[];
  /** Activate the named tab. Unknown name: the first tab, or nothing when `strict`. */
  select(name: string, strict?: boolean): void;
}

export interface TabBarOptions {
  /** Read a Lucide icon name from each `[!tab|icon]` panel's metadata. */
  icons?: boolean;
  /** Runs after a click has selected `tab`. */
  onPick?: (tab: Tab) => void;
}

/**
 * Turn the `[!tab]` callouts in `panels` into bare panels and put a row of tab
 * buttons at the top of `content`. Shared by [!code] and [!tabs].
 */
export function buildTabBar(content: HTMLElement, panels: HTMLElement[], options: TabBarOptions = {}): TabBar {
  const bar = createDiv({ cls: "eq-tabbar" });
  content.prepend(bar);
  const tabs = panels.map((panel): Tab => {
    panel.classList.add("eq-tabpanel");
    const name = calloutName(panel, "Tab");
    const btn = bar.createEl("button", { cls: "eq-tab" });
    const icon = options.icons ? panel.dataset.calloutMetadata?.trim() : undefined;
    if (icon) setIcon(btn.createSpan({ cls: "eq-tab-icon" }), icon);
    btn.createSpan({ text: name });
    return { name, panel, btn };
  });
  const select = (name: string, strict = false) => {
    const picked = tabs.find((t) => t.name === name) ?? (strict ? undefined : tabs[0]);
    if (!picked) return;
    for (const t of tabs) {
      t.btn.classList.toggle("is-active", t === picked);
      t.panel.classList.toggle("is-active", t === picked);
    }
  };
  for (const t of tabs) {
    guard(t.btn, () => {
      select(t.name);
      options.onPick?.(t);
    });
  }
  return { tabs, select };
}
