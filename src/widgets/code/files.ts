import { guard } from "../../lib/dom";
import { calloutName } from "./tabbar";

/**
 * `[!file] name` callouts inside an editor tab become bare panes. One file =
 * name strip above the code; 2+ files = a file list on the left, the picked
 * file on the right.
 */
export function setupFiles(body: HTMLElement | null): void {
  if (!body) return;
  const files = [...body.querySelectorAll<HTMLElement>(':scope > .callout[data-callout="file"]')];
  for (const el of files) el.classList.add("eq-filepane");
  if (files.length < 2) return;
  body.classList.add("eq-files");
  const nav = createDiv({ cls: "eq-filenav" });
  const view = createDiv({ cls: "eq-fileview" });
  body.prepend(nav, view);
  const entries = files.map((el) => {
    const name = calloutName(el, "file");
    view.appendChild(el);
    const btn = nav.createEl("button", { cls: "eq-file", text: name, attr: { title: name } });
    return { el, btn };
  });
  const show = (picked: (typeof entries)[number]) => {
    for (const f of entries) {
      f.btn.classList.toggle("is-active", f === picked);
      f.el.classList.toggle("is-active", f === picked);
    }
  };
  for (const f of entries) guard(f.btn, () => show(f));
  if (entries[0]) show(entries[0]);
}
