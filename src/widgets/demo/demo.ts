import type { Widget, WidgetEnv } from "../registry";

export const DEMO_SELECTOR = '.callout[data-callout="demo"]';

/** Frame height when the callout gives none, in px. */
export const DEFAULT_HEIGHT = 400;

/** `[!demo|300]` sets the frame height in px; anything else gives the default. */
export function frameHeight(meta: string | undefined): number {
  const n = Number.parseInt(meta ?? "", 10);
  return n > 0 ? n : DEFAULT_HEIGHT;
}

/**
 * `> [!demo|height] caption` holding a link to an HTML file (`[[clock.html]]`): runs
 * the file in a sandboxed frame. `allow-scripts` without `allow-same-origin`
 * keeps the page away from the vault and from Obsidian itself.
 */
export async function setupDemo(box: HTMLElement, env: WidgetEnv): Promise<void> {
  if (box.dataset.eqDemo) return;
  const content = box.querySelector<HTMLElement>(":scope > .callout-content");
  const link = content?.querySelector<HTMLElement>("a.internal-link");
  if (!content || !link) return;
  const { app } = env.plugin;
  const target = link.dataset.href ?? link.getAttribute("href") ?? "";
  const file = app.metadataCache.getFirstLinkpathDest(target, env.ctx.sourcePath);
  // leave the plain link, so the note still says which file is missing
  if (file?.extension !== "html") return;
  box.dataset.eqDemo = "1";
  box.classList.add("eq-demo");
  // the callout title is the caption; the default "Demo" title is not one
  const caption = box.querySelector(":scope > .callout-title .callout-title-inner")?.textContent?.trim() ?? "";
  const shown = caption.toLowerCase() === "demo" ? "" : caption;
  const frame = createEl("iframe", {
    cls: "eq-demo-frame",
    attr: { sandbox: "allow-scripts", title: shown || file.basename },
  });
  frame.style.height = `${frameHeight(box.dataset.calloutMetadata)}px`;
  content.empty();
  content.appendChild(frame);
  if (shown) content.createDiv({ cls: "eq-demo-cap", text: shown });
  frame.srcdoc = await app.vault.cachedRead(file);
}

export const htmlDemo: Widget = {
  name: "html-demo",
  selector: DEMO_SELECTOR,
  setup: (box, env) => void setupDemo(box, env),
};
