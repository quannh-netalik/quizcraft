import { guard } from "../../lib/dom";
import type { Widget } from "../registry";

export const CAROUSEL_SELECTOR = '.callout[data-callout="carousel"]';

const svg = (d: string): string =>
  `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

/** Alt text of an image or of the image inside an embed. */
const altOf = (s: HTMLElement): string =>
  s.getAttribute("alt") ?? s.querySelector("img")?.getAttribute("alt") ?? "";

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
  // At post-process time embeds are bare `span.internal-embed`; Obsidian adds
  // `image-embed` only once the image loads, so match the bare class.
  const slides = [...content.querySelectorAll<HTMLElement>(".internal-embed, img")].filter(
    (s) => !s.parentElement?.closest(".internal-embed"),
  );
  if (slides.length < 2) return;
  box.dataset.eqCar = "1";
  box.classList.add("eq-carousel");

  const wrap = createDiv({ cls: "eq-car" });
  const stage = wrap.createDiv({ cls: "eq-car-stage" });
  for (const s of slides) stage.createDiv({ cls: "eq-car-slide" }).appendChild(s);

  // footer: [fullscreen][restart]  i / n  [prev][next]
  const bar = wrap.createDiv({ cls: "eq-car-bar" });
  const left = bar.createDiv({ cls: "eq-car-left" });
  const full = iconButton("eq-car-full", "Fullscreen", '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>');
  const restart = iconButton("eq-car-restart", "Restart", '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>');
  left.append(full, restart);
  const count = bar.createDiv({ cls: "eq-car-count" });
  const right = bar.createDiv({ cls: "eq-car-right" });
  const prev = iconButton("eq-car-prev", "Previous", '<path d="M15 18l-6-6 6-6"/>');
  const next = iconButton("eq-car-next", "Next", '<path d="M9 18l6-6-6-6"/>');
  right.append(prev, next);
  // the caption sits right under the image, inside the box
  const caption = createDiv({ cls: "eq-car-caption" });
  wrap.insertBefore(caption, bar);

  content.empty();
  content.append(wrap);

  let i = 0;
  const go = (n: number) => {
    i = Math.max(0, Math.min(slides.length - 1, n));
    for (const [k, el] of [...stage.children].entries()) el.classList.toggle("is-active", k === i);
    count.setText(`${i + 1} / ${slides.length}`);
    prev.disabled = i === 0;
    next.disabled = i === slides.length - 1;
    restart.disabled = i === 0;
    const slide = slides[i];
    caption.setText(slide ? altOf(slide) : "");
  };
  guard(prev, () => go(i - 1));
  guard(next, () => go(i + 1));
  guard(restart, () => go(0));
  guard(full, () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrap.requestFullscreen?.();
  });
  go(0);
}

export const carousel: Widget = {
  name: "carousel",
  selector: CAROUSEL_SELECTOR,
  setup: (box) => setupCarousel(box),
};
