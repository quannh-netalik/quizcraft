import type { Widget } from "../registry";
import { setupFiles } from "./files";
import { buildTabBar, markDefaultTitle } from "./tabbar";

export const CODE_SELECTOR = '.callout[data-callout="code"]';

/** localStorage key of the last language picked in any editor. */
export const LANGUAGE_KEY = "quizcraft:code-language";

/**
 * Tab switch of each set-up editor, so picking a language in one editor can
 * switch the others. With `strict`, an editor without that language keeps its tab.
 */
const selectors = new WeakMap<HTMLElement, (name: string, strict?: boolean) => void>();

/**
 * `> [!code] caption` holding `>> [!tab] Go` callouts: a dark code editor with
 * one tab per language. A tab holds one code block or `>>> [!file] name` callouts.
 * Picking a language switches every open editor to it, and new editors start on it.
 */
export function setupCode(box: HTMLElement, { remember = true } = {}): void {
  if (box.dataset.eqTabs) return;
  const content = box.querySelector<HTMLElement>(":scope > .callout-content");
  if (!content) return;
  const panels = [...content.querySelectorAll<HTMLElement>(':scope > .callout[data-callout="tab"]')];
  box.dataset.eqTabs = "1";
  box.classList.add("eq-code");
  markDefaultTitle(box);
  // one language: `>> [!file]` callouts straight under [!code], no tab row
  if (!panels.length) {
    setupFiles(content);
    return;
  }

  for (const panel of panels) setupFiles(panel.querySelector<HTMLElement>(":scope > .callout-content"));
  const { select } = buildTabBar(content, panels, {
    onPick: (t) => {
      if (remember) localStorage.setItem(LANGUAGE_KEY, t.name);
      for (const other of document.querySelectorAll<HTMLElement>(".eq-code")) {
        // a Go-only editor must not jump to its first tab when Python is picked elsewhere
        if (other !== box) selectors.get(other)?.(t.name, true);
      }
    },
  });
  selectors.set(box, select);
  // without memory every editor opens on its first tab; live broadcast still works
  select(remember ? (localStorage.getItem(LANGUAGE_KEY) ?? "") : "");
}

export const codeEditor: Widget = {
  name: "code-editor",
  selector: CODE_SELECTOR,
  setup: (box, env) => setupCode(box, { remember: env.settings.rememberLanguage }),
};
