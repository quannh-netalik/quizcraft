import { guard } from "../../lib/dom";
import type { Widget } from "../registry";
import { setupFiles } from "./files";
import { calloutName, markDefaultTitle } from "./tabs";

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

  const bar = createDiv({ cls: "eq-tabbar" });
  content.prepend(bar);
  const tabs = panels.map((panel) => {
    panel.classList.add("eq-tabpanel");
    const name = calloutName(panel, "Tab");
    const btn = bar.createEl("button", { cls: "eq-tab", text: name });
    setupFiles(panel.querySelector<HTMLElement>(":scope > .callout-content"));
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
  box.eqSelect = select;
  for (const t of tabs) {
    guard(t.btn, () => {
      select(t.name);
      localStorage.setItem(LANGUAGE_KEY, t.name);
      for (const other of document.querySelectorAll<EditorBox>(".eq-code")) {
        // a Go-only editor must not jump to its first tab when Python is picked elsewhere
        if (other !== box) other.eqSelect?.(t.name, true);
      }
    });
  }
  select(localStorage.getItem(LANGUAGE_KEY) ?? "");
}

export const codeEditor: Widget = {
  name: "code-editor",
  selector: CODE_SELECTOR,
  setup: (box) => setupCode(box),
};
