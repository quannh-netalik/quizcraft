import type { Widget } from "../registry";
import { buildTabBar, markDefaultTitle } from "./tabbar";

export const TABS_SELECTOR = '.callout[data-callout="tabs"]';

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
  buildTabBar(content, panels, { icons: true }).select("");
}

export const contentTabs: Widget = {
  name: "content-tabs",
  selector: TABS_SELECTOR,
  setup: (box) => setupTabs(box),
};
