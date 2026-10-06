import { setIcon } from "obsidian";
import { guard } from "../../lib/dom";
import type { Widget } from "../registry";

export const TABS_SELECTOR = '.callout[data-callout="tabs"]';

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

/**
 * `> [!tabs] caption` holding `>> [!tab] Name` callouts: flat content tabs.
 * `>> [!tab|leaf] Name` puts the Lucide icon `leaf` before the name.
 * Each box keeps its own selection; the first tab starts active.
 */
export function setupTabs(box: HTMLElement): void {
  if (box.dataset.eqTabs) return;
  const content = box.querySelector<HTMLElement>(":scope > .callout-content");
  if (!content) return;
  const panels = [...content.querySelectorAll<HTMLElement>(':scope > .callout[data-callout="tab"]')];
  if (!panels.length) return;
  box.dataset.eqTabs = "1";
  box.classList.add("eq-tabs");
  markDefaultTitle(box);

  const bar = createDiv({ cls: "eq-tabbar" });
  content.prepend(bar);
  const tabs = panels.map((panel) => {
    panel.classList.add("eq-tabpanel");
    const btn = bar.createEl("button", { cls: "eq-tab" });
    const icon = panel.dataset.calloutMetadata?.trim();
    if (icon) setIcon(btn.createSpan({ cls: "eq-tab-icon" }), icon);
    btn.createSpan({ text: calloutName(panel, "Tab") });
    return { panel, btn };
  });
  const select = (picked: (typeof tabs)[number]) => {
    for (const t of tabs) {
      t.btn.classList.toggle("is-active", t === picked);
      t.panel.classList.toggle("is-active", t === picked);
    }
  };
  for (const t of tabs) guard(t.btn, () => select(t));
  if (tabs[0]) select(tabs[0]);
}

export const contentTabs: Widget = {
  name: "content-tabs",
  selector: TABS_SELECTOR,
  setup: (box) => setupTabs(box),
};
