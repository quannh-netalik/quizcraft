import { describe, expect, test } from "bun:test";
import { DEFAULT_HEIGHT, frameHeight, setupDemo } from "../../src/widgets/demo/demo";
import type { WidgetEnv } from "../../src/widgets/registry";
import { callout } from "../helpers/dom";

const PAGE = "<p>tick</p>";

/** An env whose vault holds only `clock.html` and `notes.md`. */
function env(): WidgetEnv {
  const files: Record<string, { basename: string; extension: string }> = {
    "clock.html": { basename: "clock", extension: "html" },
    "notes.md": { basename: "notes", extension: "md" },
  };
  const app = {
    metadataCache: { getFirstLinkpathDest: (path: string) => files[path] ?? null },
    vault: { cachedRead: () => Promise.resolve(PAGE) },
  };
  return { plugin: { app }, ctx: { sourcePath: "note.md" } } as unknown as WidgetEnv;
}

async function demo(href: string, options: { title?: string; meta?: string } = {}): Promise<HTMLElement> {
  const el = callout("demo", `<p><a class="internal-link" data-href="${href}" href="${href}">${href}</a></p>`, options);
  await setupDemo(el, env());
  return el;
}

describe("frameHeight", () => {
  test.each([
    ["300", 300],
    [" 250px", 250],
    [undefined, DEFAULT_HEIGHT],
    ["", DEFAULT_HEIGHT],
    ["tall", DEFAULT_HEIGHT],
    ["0", DEFAULT_HEIGHT],
    ["-20", DEFAULT_HEIGHT],
  ])("%p gives %p", (meta, want) => {
    expect(frameHeight(meta)).toBe(want);
  });
});

describe("setupDemo", () => {
  test("runs the file in a sandboxed frame", async () => {
    const el = await demo("clock.html", { title: "A ticking clock", meta: "260" });
    const frame = el.querySelector("iframe")!;
    expect(frame.getAttribute("sandbox")).toBe("allow-scripts");
    expect(frame.srcdoc).toBe(PAGE);
    expect(frame.style.height).toBe("260px");
    expect(el.querySelector(".eq-demo-cap")?.textContent).toBe("A ticking clock");
  });

  test("skips the caption for the default title", async () => {
    const el = await demo("clock.html", { title: "Demo" });
    expect(el.querySelector(".eq-demo-cap")).toBeNull();
    expect(el.querySelector("iframe")!.title).toBe("clock");
  });

  test.each([["missing.html"], ["notes.md"]])("keeps the plain link for %p", async (href) => {
    const el = await demo(href);
    expect(el.classList.contains("eq-demo")).toBe(false);
    expect(el.querySelector("iframe")).toBeNull();
    expect(el.querySelector("a.internal-link")).not.toBeNull();
  });
});
