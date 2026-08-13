const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");
const { installObsidianDom } = require("./dom-test-helpers.cjs");

test("scopes Markdown rendering and cleanup to the registered quiz child", async () => {
  const { Window } = await import("happy-dom");
  const window = new Window();
  installObsidianDom(window);

  const renderedComponents = [];
  let disconnected = false;
  const registered = [];
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    disconnect() { disconnected = true; }
  };
  global.requestAnimationFrame = () => 1;
  global.cancelAnimationFrame = () => {};

  class Plugin {
    constructor() { this.app = {}; }
    registerMarkdownCodeBlockProcessor(language, processor) {
      registered.push({ language, processor });
    }
  }

  class MarkdownRenderChild {
    constructor(containerEl) { this.containerEl = containerEl; }
  }

  const obsidian = {
    Plugin,
    MarkdownRenderChild,
    MarkdownRenderer: {
      render(_app, markdown, element, _sourcePath, component) {
        renderedComponents.push(component);
        element.setText(markdown);
        return Promise.resolve();
      },
    },
    parseYaml() {
      return {
        questions: [{
          type: "matching",
          question: "Match the terms",
          pairs: [["One", "1"], ["Two", "2"]],
        }],
      };
    },
  };
  const originalLoad = Module._load;
  Module._load = (request, parent, isMain) => request === "obsidian"
    ? obsidian
    : originalLoad(request, parent, isMain);

  try {
    const modulePath = path.join(__dirname, "../.test-dist/main.cjs");
    delete require.cache[require.resolve(modulePath)];
    const QuizcraftPlugin = require(modulePath).default;
    const plugin = new QuizcraftPlugin();
    plugin.onload();

    const children = [];
    registered[0].processor("", document.createElement("div"), {
      sourcePath: "quiz.md",
      addChild: (child) => children.push(child),
    });

    assert.equal(registered[0].language, "quizcraft");
    assert.equal(children.length, 1);
    assert.ok(renderedComponents.length > 0);
    assert.ok(renderedComponents.every((component) => component === children[0]));

    children[0].onunload();
    assert.equal(disconnected, true);
  } finally {
    Module._load = originalLoad;
  }
});
