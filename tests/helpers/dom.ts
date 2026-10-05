/** Renders the HTML Obsidian produces for a callout and returns the callout element. */
export function callout(type: string, body: string, options: { title?: string; meta?: string } = {}): HTMLElement {
  const meta = options.meta === undefined ? "" : ` data-callout-metadata="${options.meta}"`;
  document.body.innerHTML = `
    <div class="callout" data-callout="${type}"${meta}>
      <div class="callout-title"><div class="callout-title-inner">${options.title ?? type}</div></div>
      <div class="callout-content">${body}</div>
    </div>`;
  return document.body.querySelector<HTMLElement>(".callout")!;
}

export const content = (el: HTMLElement): HTMLElement => el.querySelector<HTMLElement>(":scope > .callout-content")!;

export function click(el: Element): void {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}
