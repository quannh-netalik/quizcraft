const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("has publishable Obsidian package metadata", () => {
  const pkg = JSON.parse(read("package.json"));
  const manifest = JSON.parse(read("manifest.json"));
  const { OBQUIZ_CONFIG } = require("../.test-dist/config.cjs");
  assert.equal(pkg.name, "obquiz");
  assert.equal(pkg.main, "main.js");
  assert.deepEqual(pkg.files, ["main.js", "manifest.json", "styles.css", "README.md"]);
  assert.ok(pkg.scripts.dev && pkg.scripts.build && pkg.scripts.test);
  assert.equal(manifest.id, "obquiz");
  assert.equal(OBQUIZ_CONFIG.pluginId, manifest.id);
  assert.equal(OBQUIZ_CONFIG.codeBlockLanguage, "obquiz");
  assert.equal(manifest.name, "Obsidian Quiz");
  assert.equal(manifest.isDesktopOnly, false);
});

test("keeps plugin registration and interaction renderers in focused modules", () => {
  const entry = read("src/main.ts");
  assert.match(entry, /registerMarkdownCodeBlockProcessor\(OBQUIZ_CONFIG\.codeBlockLanguage/);
  assert.match(entry, /parseYaml/);
  assert.match(entry, /import \{ QuizController \} from "\.\/quiz-controller"/);
  assert.match(entry, /context\.addChild\(new QuizRenderChild\(element, controller\)\)/);
  assert.doesNotMatch(entry, /export class QuizController/);

  for (const file of [
    "src/quiz-controller.ts",
    "src/quiz-render-child.ts",
    "src/renderers/contracts.ts",
    "src/renderers/choice-renderer.ts",
    "src/renderers/matching-renderer.ts",
    "src/renderers/ordering-renderer.ts",
  ]) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} must exist`);
  }
});

test("renders the compact footer control contract", () => {
  const controller = read("src/quiz-controller.ts");
  const css = read("styles.css");

  assert.match(controller, /cls: "obquiz-question-reset",\s*text: "↻"/);
  assert.match(controller, /aria-label": "Reset this question"/);
  assert.match(controller, /cls: "obquiz-previous", text: "<"/);
  assert.match(controller, /aria-label": "Previous question"/);
  assert.match(controller, /cls: "obquiz-progress-current", text: `\$\{this\.index \+ 1\}`/);
  assert.match(controller, /cls: "obquiz-progress-total", text: `\/\$\{this\.quiz\.questions\.length\}`/);
  assert.match(controller, /cls: "obquiz-next", text: ">"/);
  assert.match(controller, /aria-label": "Next question"/);
  assert.match(controller, /text: "Check", cls: "mod-cta obquiz-check"/);
  assert.match(controller, /check\.disabled = state\.checked \|\| !isQuestionReady\(question, state\)/);
  assert.doesNotMatch(controller, /Check Answer|‹ Previous|Next ›/);

  assert.match(css, /\.obquiz-pager\s*\{[^}]*grid-template-columns:\s*minmax\([^;]+\) auto minmax\([^;]+\)/s);
  assert.match(css, /\.obquiz-progress-current\s*\{[^}]*font-weight:\s*var\(--font-bold\)/s);
});

test("keeps footer buttons equal and explanations visually neutral", () => {
  const controller = read("src/quiz-controller.ts");
  const css = read("styles.css");

  assert.match(css, /\.obquiz-question-reset,\s*\.obquiz-previous,\s*\.obquiz-next,\s*\.obquiz-check\s*\{[^}]*width:\s*3\.75rem[^}]*min-width:\s*3\.75rem[^}]*min-height:\s*2\.75rem/s);
  assert.match(css, /\.obquiz-question-reset,\s*\.obquiz-previous,\s*\.obquiz-next\s*\{[^}]*font-size:\s*var\(--font-ui-large\)/s);

  const explanation = css.match(/\.obquiz-explanation\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.match(explanation, /background:\s*var\(--background-primary\)/);
  assert.match(explanation, /border:\s*1px solid color-mix\(in srgb, var\(--obquiz-accent\)/);
  assert.doesNotMatch(explanation, /var\(--obquiz-success\)/);

  assert.match(controller, /const explanation = card\.createDiv\(\{ cls: "obquiz-explanation" \}\);\s*explanation\.createDiv\(\{ cls: "obquiz-explanation-label", text: "Explanation" \}\);\s*this\.renderMarkdown\(question\.explanation, explanation\)/s);
  assert.match(css, /\.obquiz-explanation-label\s*\{[^}]*margin-bottom:\s*0\.5rem[^}]*font-size:\s*var\(--font-ui-small\)[^}]*font-weight:\s*var\(--font-semibold\)/s);
});

test("matching card text remains selectable", () => {
  const css = read("styles.css");

  assert.match(css, /\.obquiz-match-content\s*\{[^}]*user-select:\s*text/s);
});

test("documents all types and keeps styles scoped", () => {
  const readme = read("README.md");
  const css = read("styles.css");
  for (const type of ["single", "multiple", "matching", "ordering"]) {
    assert.match(readme, new RegExp(`type: ${type}`));
  }
  assert.match(readme, /```obquiz/);
  assert.match(css, /\.obquiz-matching/);
  assert.match(css, /\.obquiz-ordering/);
  assert.match(css, /\.obquiz-pager/);
  assert.match(css, /\.obquiz-match-port/);
  assert.match(css, /\.obquiz-match-column:first-of-type \.obquiz-match-port\s*\{[^}]*right:\s*0/s);
  assert.match(css, /\.obquiz-match-column:nth-of-type\(2\) \.obquiz-match-port\s*\{[^}]*left:\s*0/s);
  assert.match(css, /\.obquiz-option::after\s*\{[^}]*position:\s*absolute[^}]*top:/s);
  assert.match(css, /\.obquiz-option\s*\{[^}]*--obquiz-option-background:\s*transparent[^}]*background:\s*var\(--obquiz-option-background\)/s);
  assert.match(css, /\.obquiz-match-card\s*\{[^}]*background:\s*var\(--background-primary\)\s*!important/s);
  assert.match(css, /\.obquiz-order-card\s*\{[^}]*background:\s*transparent/s);
  assert.match(css, /\.obquiz-question-reset\s*\{[^}]*background:\s*transparent[^}]*border:\s*(?:0|none|1px solid transparent)[^}]*box-shadow:\s*none/s);
  assert.match(css, /\.obquiz-previous,\s*\.obquiz-next\s*\{[^}]*background:\s*transparent[^}]*border:\s*(?:0|none|1px solid transparent)[^}]*box-shadow:\s*none/s);
  assert.doesNotMatch(css, /input\[type="checkbox"\]:checked[^}]*\{[^}]*--obquiz-option-background:\s*color-mix/s);
  assert.match(css, /\.obquiz-option\.is-correct\s*\{[^}]*--obquiz-option-border:\s*color-mix/s);
  assert.match(css, /\.obquiz-option\.is-incorrect\s*\{[^}]*--obquiz-option-border:\s*color-mix/s);
  assert.match(css, /\.obquiz-match-card:hover:not\(:disabled\)\s*\{[^}]*background:\s*var\(--background-primary\)\s*!important/s);
  assert.match(css, /\.obquiz-match-card\.is-pending\s*\{[^}]*background:\s*var\(--background-primary\)\s*!important/s);
  assert.match(css, /\.obquiz-match-card\.is-pending:hover:not\(:disabled\),\s*\.obquiz-match-card\.is-connected:hover:not\(:disabled\)\s*\{[^}]*border-color:\s*var\(--obquiz-accent\)[^}]*box-shadow:\s*0 0 0 1px var\(--obquiz-accent\),\s*0 0 10px color-mix\(in srgb, var\(--obquiz-accent\) 20%, transparent\)/s);
  assert.match(css, /\.obquiz-option\.is-correct:hover[\s\S]*box-shadow:[^}]*var\(--obquiz-success\)/);
  assert.match(css, /\.obquiz-option\.is-incorrect:hover[\s\S]*box-shadow:[^}]*var\(--obquiz-danger\)/);
  assert.match(css, /\.obquiz-option\.is-correct input[\s\S]*accent-color:\s*var\(--obquiz-success\)[^}]*border-color:\s*var\(--obquiz-success\)/);
  assert.match(css, /\.obquiz-option\.is-incorrect input[\s\S]*accent-color:\s*var\(--obquiz-danger\)[^}]*border-color:\s*var\(--obquiz-danger\)/);
  assert.match(css, /\.obquiz-option\.is-correct input:checked[\s\S]*background-color:\s*var\(--obquiz-success\)\s*!important[^}]*border-color:\s*var\(--obquiz-success\)\s*!important/);
  assert.match(css, /\.obquiz-option\.is-incorrect input:checked[\s\S]*background-color:\s*var\(--obquiz-danger\)\s*!important[^}]*border-color:\s*var\(--obquiz-danger\)\s*!important/);
  assert.match(css, /\.obquiz-order-card:hover:not\(\.is-correct\):not\(\.is-incorrect\)[\s\S]*border-color:\s*var\(--obquiz-border-hover\)/);
  assert.match(css, /\.obquiz-order-card\.is-correct:hover[\s\S]*box-shadow:[^}]*var\(--obquiz-success\)/);
  assert.match(css, /\.obquiz-order-card\.is-incorrect:hover[\s\S]*box-shadow:[^}]*var\(--obquiz-danger\)/);
  assert.match(css, /\.obquiz-order-index\s*\{[^}]*background:\s*transparent[^}]*border:\s*1px solid var\(--obquiz-border\)/s);
  assert.match(css, /\.obquiz-order-card\.is-dragging\s*\{[^}]*background:\s*transparent[^}]*border:\s*1px dashed var\(--obquiz-accent\)[^}]*box-shadow:\s*none/s);
  assert.match(css, /\.obquiz-order-card\.is-dragging > \*\s*\{[^}]*visibility:\s*hidden/s);
  assert.match(css, /\.obquiz-order-card\.is-reordering[\s\S]*transition:\s*transform/);
  assert.match(css, /\.obquiz-option:has\(input:disabled\),\s*\.obquiz-match-card:disabled,\s*\.obquiz-order-card\.is-correct,\s*\.obquiz-order-card\.is-incorrect\s*\{[^}]*cursor:\s*default[^}]*user-select:\s*none/s);
  assert.match(css, /\.obquiz-option input:disabled\s*\{[^}]*cursor:\s*default/s);
  assert.match(css, /\.obquiz-question-type,\s*\.obquiz-status\s*\{[^}]*display:\s*inline-flex[^}]*padding:\s*0\.25rem 0\.6rem[^}]*border-radius:\s*999px/s);
  assert.match(css, /\.obquiz-question-type\s*\{[^}]*background:\s*transparent[^}]*border:\s*1px solid var\(--obquiz-border\)/s);
  assert.match(css, /\.obquiz-match-card\s*\{[^}]*appearance:\s*none[^}]*background(?:-color)?:\s*var\(--background-primary\)\s*!important/s);
  assert.match(css, /\.obquiz-question-reset\s*\{[^}]*appearance:\s*none/s);
  assert.match(css, /\.obquiz-previous,\s*\.obquiz-next\s*\{[^}]*appearance:\s*none/s);
  assert.match(css, /\.obquiz-completion/);
  assert.match(css, /input\[type="checkbox"\][^{]*\{[^}]*border-radius:\s*(?:0|2px|3px|4px)/s);
  assert.match(css, /cursor:\s*pointer/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
