import { expect, spyOn, test } from "bun:test";
import QuizcraftPlugin from "../src/main";
import { DEFAULT_SETTINGS } from "../src/settings/settings";
import { findAll, renderWidgets, WIDGETS, type Widget, type WidgetEnv } from "../src/widgets/registry";

test("plugin registers a single markdown post-processor", async () => {
  const plugin = new QuizcraftPlugin({} as never, {} as never);
  await plugin.onload();
  expect((plugin as unknown as { postProcessors: unknown[] }).postProcessors).toHaveLength(1);
});

test("findAll includes the root when it matches", () => {
  document.body.innerHTML = `<div class="callout" data-callout="quiz"><div class="callout" data-callout="quiz"></div></div>`;
  const outer = document.body.firstElementChild as HTMLElement;
  expect(findAll(outer, '.callout[data-callout="quiz"]')).toEqual([outer]);
  expect(findAll(document.body, '.callout[data-callout="quiz"]')).toHaveLength(2);
});

test("renderWidgets runs each widget on its own callouts", () => {
  document.body.innerHTML = `<div class="callout" data-callout="quiz"></div><div class="callout" data-callout="code"></div>`;
  const seen: string[] = [];
  const widgets: Widget[] = [
    { name: "quiz", selector: '.callout[data-callout="quiz"]', setup: (el) => seen.push(`quiz:${el.dataset.callout}`) },
    { name: "code", selector: '.callout[data-callout="code"]', setup: (el) => seen.push(`code:${el.dataset.callout}`) },
  ];
  renderWidgets(document.body, { plugin: {} as never, ctx: {} as never, settings: { ...DEFAULT_SETTINGS } }, widgets);
  expect(seen).toEqual(["quiz:quiz", "code:code"]);
});

const env = (): WidgetEnv => ({ plugin: {} as never, ctx: {} as never, settings: { ...DEFAULT_SETTINGS } });

/** The names of the built-in widgets whose selector matches `html`'s root callout. */
function owners(html: string): string[] {
  document.body.innerHTML = html;
  const el = document.body.firstElementChild as HTMLElement;
  return WIDGETS.filter((w) => el.matches(w.selector)).map((w) => w.name);
}

test("the card widget runs before every other quiz widget", () => {
  const names = WIDGETS.map((w) => w.name);
  for (const quiz of ["choice-quiz", "order-quiz", "match-quiz"]) {
    expect(names.indexOf("quiz-card")).toBeLessThan(names.indexOf(quiz));
  }
});

test("widget names are unique", () => {
  expect(new Set(WIDGETS.map((w) => w.name)).size).toBe(WIDGETS.length);
});

test.each([
  [`<div class="callout" data-callout="quiz"></div>`, ["quiz-card", "choice-quiz"]],
  [`<div class="callout" data-callout="quiz" data-callout-metadata="order"></div>`, ["quiz-card", "choice-quiz", "order-quiz"]],
  [`<div class="callout" data-callout="quiz" data-callout-metadata="match"></div>`, ["quiz-card", "choice-quiz", "match-quiz"]],
  [`<div class="callout" data-callout="code"></div>`, ["code-editor"]],
  [`<div class="callout" data-callout="tabs"></div>`, ["content-tabs"]],
  [`<div class="callout" data-callout="carousel"></div>`, ["carousel"]],
  [`<div class="callout" data-callout="calc"></div>`, ["calc"]],
  [`<div class="callout" data-callout="demo"></div>`, ["html-demo"]],
  [`<div class="callout" data-callout="note"></div>`, []],
])("%s is handled by %p", (html, want) => {
  expect(owners(html)).toEqual(want);
});

test("renderWidgets on an order quiz sets up the card and the order widget only", () => {
  document.body.innerHTML = `<div class="callout" data-callout="quiz" data-callout-metadata="order">
    <div class="callout-content"><ul><li>b</li><li>a</li></ul><p><mark>Answer</mark></p><ol><li>a</li><li>b</li></ol></div>
  </div>`;
  const el = document.body.firstElementChild as HTMLElement;
  renderWidgets(document.body, env());
  expect(el.classList.contains("eq-card")).toBe(true);
  expect(el.classList.contains("eq-order")).toBe(true);
  // the choice widget skips callouts with metadata
  expect(el.querySelector(".eq-option")).toBeNull();
});

test("a throwing widget does not stop the others", () => {
  document.body.innerHTML = `<div class="callout" data-callout="quiz"></div><div class="callout" data-callout="quiz"></div>`;
  const seen: number[] = [];
  let n = 0;
  const widgets: Widget[] = [
    {
      name: "broken",
      selector: '.callout[data-callout="quiz"]',
      setup: () => {
        n += 1;
        if (n === 1) throw new Error("boom");
      },
    },
    { name: "after", selector: '.callout[data-callout="quiz"]', setup: () => seen.push(n) },
  ];
  const log = spyOn(console, "error").mockImplementation(() => {});
  renderWidgets(document.body, env(), widgets);
  expect(n).toBe(2);
  expect(seen).toEqual([2, 2]);
  expect(log).toHaveBeenCalledTimes(1);
  log.mockRestore();
});
