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
  box.dataset.eqDemo = "1";
  box.classList.add("eq-demo");

  const { app } = env.plugin;
  const target = link.dataset.href ?? link.getAttribute("href") ?? "";
  const file = app.metadataCache.getFirstLinkpathDest(target, env.ctx.sourcePath);
  const frame = createEl("iframe", {
    cls: "eq-demo-frame",
    attr: { sandbox: "allow-scripts", title: file?.basename ?? target },
  });
  frame.style.height = `${frameHeight(box.dataset.calloutMetadata)}px`;
  content.empty();
  content.appendChild(frame);
  frame.srcdoc = file ? await app.vault.cachedRead(file) : "";
}

export const htmlDemo: Widget = {
  name: "html-demo",
  selector: DEMO_SELECTOR,
  setup: (box, env) => void setupDemo(box, env),
};
