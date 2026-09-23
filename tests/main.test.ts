import { expect, test } from "bun:test";
import QuizcraftPlugin from "../src/main";
import { findAll, renderWidgets, type Widget } from "../src/widgets";

test("plugin registers a single markdown post-processor", () => {
  const plugin = new QuizcraftPlugin({} as never, {} as never);
  plugin.onload();
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
  renderWidgets(document.body, { plugin: {} as never, ctx: {} as never }, widgets);
  expect(seen).toEqual(["quiz:quiz", "code:code"]);
});
