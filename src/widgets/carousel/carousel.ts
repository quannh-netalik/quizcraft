import { guard } from "../../lib/dom";
import type { Widget } from "../registry";

export const CAROUSEL_SELECTOR = '.callout[data-callout="carousel"]';

const svg = (d: string): string =>
  `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

/** Footer button, icon only; `title` doubles as the accessible name. */
function iconButton(cls: string, title: string, path: string): HTMLButtonElement {
  const b = createEl("button", { cls: `eq-car-btn ${cls}`, attr: { title, "aria-label": title } });
  b.innerHTML = svg(path);
  return b;
}

/**
 * `> [!carousel]` holding image embeds, one per line: a slide viewer that
 * shows one image at a time. Fewer than two images leaves the callout alone.
 */
export function setupCarousel(box: HTMLElement): void {
  if (box.dataset.eqCar) return;
  const content = box.querySelector<HTMLElement>(":scope > .callout-content");
  if (!content) return;
  const slides = [...content.querySelectorAll<HTMLElement>(".image-embed, img")].filter(
    (s) => !s.parentElement?.closest(".image-embed"),
  );
  if (slides.length < 2) return;
  box.dataset.eqCar = "1";
  box.classList.add("eq-carousel");

  const wrap = createDiv({ cls: "eq-car" });
  const stage = wrap.createDiv({ cls: "eq-car-stage" });
  for (const s of slides) stage.createDiv({ cls: "eq-car-slide" }).appendChild(s);

  // footer: counter in the middle, prev/next on the right
  const bar = wrap.createDiv({ cls: "eq-car-bar" });
  bar.createDiv({ cls: "eq-car-left" });
  const count = bar.createDiv({ cls: "eq-car-count" });
  const right = bar.createDiv({ cls: "eq-car-right" });
  const prev = iconButton("eq-car-prev", "Previous", '<path d="M15 18l-6-6 6-6"/>');
  const next = iconButton("eq-car-next", "Next", '<path d="M9 18l6-6-6-6"/>');
  right.append(prev, next);

  content.empty();
  content.append(wrap);

  let i = 0;
  const go = (n: number) => {
    i = Math.max(0, Math.min(slides.length - 1, n));
    for (const [k, el] of [...stage.children].entries()) el.classList.toggle("is-active", k === i);
    count.setText(`${i + 1} / ${slides.length}`);
    prev.disabled = i === 0;
    next.disabled = i === slides.length - 1;
  };
  guard(prev, () => go(i - 1));
  guard(next, () => go(i + 1));
  go(0);
}

export const carousel: Widget = {
  name: "carousel",
  selector: CAROUSEL_SELECTOR,
  setup: (box) => setupCarousel(box),
};
