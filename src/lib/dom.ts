/** Stop an event before Obsidian sees it. */
export function swallow(e: Event): void {
  e.preventDefault();
  e.stopPropagation();
}

/**
 * Click handler that keeps Live Preview out of the way: a mousedown or click
 * reaching the editor moves the cursor into the callout source, which swaps the
 * widget for raw markdown. Both are swallowed; `handler` runs on click.
 */
export function guard(node: HTMLElement, handler: (e: MouseEvent) => void): void {
  node.addEventListener("mousedown", swallow);
  node.addEventListener("click", (e) => {
    swallow(e);
    handler(e);
  });
}

/**
 * Move the content of a list item into one span with class `cls`, so it can be
 * a flex child. Obsidian's bullet and fold markers stay direct children, where
 * themes and snippets expect them.
 */
export function wrapChildren(li: HTMLElement, cls: string): HTMLSpanElement {
  const span = createSpan({ cls });
  // copy first: moving nodes out changes the live childNodes list
  for (const n of Array.from(li.childNodes)) {
    const marker =
      n instanceof HTMLElement && (n.classList.contains("list-bullet") || n.classList.contains("list-collapse-indicator"));
    if (!marker) span.append(n);
  }
  li.append(span);
  return span;
}
