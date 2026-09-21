import { expect, test } from "bun:test";
import QuizcraftPlugin from "../src/main";

test("plugin loads without touching the DOM", () => {
  const plugin = new QuizcraftPlugin({} as never, {} as never);
  expect(() => plugin.onload()).not.toThrow();
  expect(document.body.children.length).toBe(0);
});
