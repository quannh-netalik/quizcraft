// Preloaded by bun test (bunfig.toml): a happy-dom window as the global DOM, plus an `obsidian` stub.
import { mock } from "bun:test";
import { Window } from "happy-dom";
import * as obsidian from "./obsidian-stub";

const window = new Window({ url: "http://localhost/" });
const globals = globalThis as unknown as Record<string, unknown>;
const source = window as unknown as Record<string, unknown>;
const KEYS = [
  "document",
  "navigator",
  "Node",
  "Element",
  "HTMLElement",
  "Text",
  "DocumentFragment",
  "NodeFilter",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "localStorage",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
];
globals.window = window;
for (const key of KEYS) {
  const value = source[key];
  globals[key] = typeof value === "function" && /^[a-z]/.test(key) ? value.bind(window) : value;
}

mock.module("obsidian", () => obsidian);
