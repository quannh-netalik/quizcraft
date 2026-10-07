import type { Widget } from "../registry";
import { setupFiles } from "./files";
import { buildTabBar, markDefaultTitle } from "./tabbar";

export const CODE_SELECTOR = '.callout[data-callout="code"]';

/** localStorage key of the last language picked in any editor. */
export const LANGUAGE_KEY = "quizcraft:code-language";

/**
 * An editor after setupCode: `eqSelect` switches it to the named tab. With
 * `strict`, an editor without that tab keeps its current one.
 */
interface EditorBox extends HTMLElement {
  eqSelect?: (name: string, strict?: boolean) => void;
}

/**
 * `> [!code] caption` holding `>> [!tab] Go` callouts: a dark code editor with
 * one tab per language. A tab holds one code block or `>>> [!file] name` callouts.
 * Picking a language switches every open editor to it, and new editors start on it.
 */
export function setupCode(box: EditorBox): void {
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
      localStorage.setItem(LANGUAGE_KEY, t.name);
      for (const other of document.querySelectorAll<EditorBox>(".eq-code")) {
        // a Go-only editor must not jump to its first tab when Python is picked elsewhere
        if (other !== box) other.eqSelect?.(t.name, true);
      }
    },
  });
  box.eqSelect = select;
  select(localStorage.getItem(LANGUAGE_KEY) ?? "");
}

export const codeEditor: Widget = {
  name: "code-editor",
  selector: CODE_SELECTOR,
  setup: (box) => setupCode(box),
};
