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
