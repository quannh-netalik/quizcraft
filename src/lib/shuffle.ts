/**
 * Fisher-Yates copy of `items`. When `same` says the result still matches the
 * order to avoid, it deals again (up to 10 times), then falls back to reversing.
 */
export function shuffled<T>(
  items: readonly T[],
  same?: (order: readonly T[]) => boolean,
  random: () => number = Math.random,
): T[] {
  if (items.length < 2) return [...items];
  for (let tries = 0; tries < 10; tries++) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j] as T, a[i] as T];
    }
    if (!same?.(a)) return a;
  }
  // toReversed() needs ES2023; older Obsidian desktop builds do not ship it
  return items.map((_, i) => items[items.length - 1 - i] as T);
}

/** True when `order` lists the same items as `items`, in the same place. */
export const sameOrder =
  <T>(items: readonly T[]) =>
  (order: readonly T[]): boolean =>
    order.every((x, i) => x === items[i]);
