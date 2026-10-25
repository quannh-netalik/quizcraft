import { setIcon } from "obsidian";
import { guard } from "../../lib/dom";
import type { Widget } from "../registry";

export const CAROUSEL_SELECTOR = '.callout[data-callout="carousel"]';

/** Obsidian fills alt with the file name when the embed has no caption. */
const FILE_NAME_RE = /\.(svg|png|jpe?g|gif|webp|avif|bmp)$/i;

/** Caption for a slide: its alt text, unless that is only the file name. */
export function captionOf(s: HTMLElement): string {
  const alt = s.getAttribute("alt") || s.querySelector("img")?.getAttribute("alt") || "";
  return FILE_NAME_RE.test(alt.trim()) ? "" : alt;
}

/** Footer button with a Lucide icon; `title` doubles as the accessible name. */
function iconButton(cls: string, title: string, icon: string): HTMLButtonElement {
  const b = createEl("button", { cls: `eq-car-btn ${cls}`, attr: { title, "aria-label": title } });
  setIcon(b, icon);
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

  const wrap = createDiv({ cls: "eq-car", attr: { tabindex: "0" } });
  const stage = wrap.createDiv({ cls: "eq-car-stage" });
  for (const s of slides) stage.createDiv({ cls: "eq-car-slide" }).append(s);

  // footer: [fullscreen][restart]  i / n  [prev][next]
  const bar = wrap.createDiv({ cls: "eq-car-bar" });
  const left = bar.createDiv({ cls: "eq-car-left" });
  const full = iconButton("eq-car-full", "Fullscreen", "maximize");
  const restart = iconButton("eq-car-restart", "Restart", "rotate-ccw");
  left.append(full, restart);
  const count = bar.createDiv({ cls: "eq-car-count" });
  const right = bar.createDiv({ cls: "eq-car-right" });
  const prev = iconButton("eq-car-prev", "Previous", "chevron-left");
  const next = iconButton("eq-car-next", "Next", "chevron-right");
  right.append(prev, next);
  // the caption sits right under the image, inside the box
  const caption = createDiv({ cls: "eq-car-caption" });
  bar.before(caption);

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
    caption.setText(slide ? captionOf(slide) : "");
  };
  guard(prev, () => go(i - 1));
  guard(next, () => go(i + 1));
  guard(restart, () => go(0));
  guard(full, () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrap.requestFullscreen?.();
  });
  // clicking a slide pages forward; guard also keeps it from opening the image
  // or moving the cursor into the callout source
  guard(stage, () => go(i + 1));
  // arrow keys page while the box has focus
  wrap.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    go(e.key === "ArrowRight" ? i + 1 : i - 1);
  });
  go(0);
}

export const carousel: Widget = {
  name: "carousel",
  selector: CAROUSEL_SELECTOR,
  setup: (box) => setupCarousel(box),
};
