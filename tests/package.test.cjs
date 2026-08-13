const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("has publishable Obsidian package metadata", () => {
  const pkg = JSON.parse(read("package.json"));
  const manifest = JSON.parse(read("manifest.json"));
  const { QUIZCRAFT_CONFIG } = require("../.test-dist/config.cjs");
  assert.equal(pkg.name, "quizcraft");
  assert.equal(pkg.main, "main.js");
  assert.deepEqual(pkg.files, ["main.js", "manifest.json", "styles.css", "README.md"]);
  assert.ok(pkg.scripts.dev && pkg.scripts.build && pkg.scripts.test);
  assert.equal(manifest.id, "quizcraft");
  assert.equal(QUIZCRAFT_CONFIG.pluginId, manifest.id);
  assert.equal(QUIZCRAFT_CONFIG.codeBlockLanguage, "quizcraft");
  assert.equal(manifest.name, "Quizcraft");
  assert.equal(manifest.author, "Quan Nguyen");
  assert.equal(manifest.authorUrl, "https://github.com/quannh-netalik");
  assert.equal(manifest.isDesktopOnly, false);
});

test("keeps plugin registration and interaction renderers in focused modules", () => {
  const entry = read("src/main.ts");
  assert.match(entry, /registerMarkdownCodeBlockProcessor\(QUIZCRAFT_CONFIG\.codeBlockLanguage/);
  assert.match(entry, /parseYaml/);
  assert.match(entry, /import \{ QuizController \} from "\.\/quiz-controller"/);
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

  assert.match(controller, /cls: "quizcraft-question-reset",\s*text: "↻"/);
  assert.match(controller, /aria-label": "Reset this question"/);
  assert.match(controller, /cls: "quizcraft-previous", text: "<"/);
  assert.match(controller, /aria-label": "Previous question"/);
  assert.match(controller, /cls: "quizcraft-progress-current", text: `\$\{this\.index \+ 1\}`/);
  assert.match(controller, /cls: "quizcraft-progress-total", text: `\/\$\{this\.quiz\.questions\.length\}`/);
  assert.match(controller, /cls: "quizcraft-next", text: ">"/);
  assert.match(controller, /aria-label": "Next question"/);
  assert.match(controller, /text: "Check", cls: "mod-cta quizcraft-check"/);
  assert.match(controller, /check\.disabled = state\.checked \|\| !isQuestionReady\(question, state\)/);
  assert.doesNotMatch(controller, /Check Answer|‹ Previous|Next ›/);

  assert.match(css, /\.quizcraft-pager\s*\{[^}]*grid-template-columns:\s*minmax\([^;]+\) auto minmax\([^;]+\)/s);
  assert.match(css, /\.quizcraft-progress-current\s*\{[^}]*font-weight:\s*var\(--font-bold\)/s);
});

test("keeps footer buttons equal and explanations visually neutral", () => {
  const controller = read("src/quiz-controller.ts");
  const css = read("styles.css");

  assert.match(css, /\.quizcraft-question-reset,\s*\.quizcraft-previous,\s*\.quizcraft-next,\s*\.quizcraft-check\s*\{[^}]*width:\s*3\.75rem[^}]*min-width:\s*3\.75rem[^}]*min-height:\s*2\.75rem/s);
  assert.match(css, /\.quizcraft-question-reset,\s*\.quizcraft-previous,\s*\.quizcraft-next\s*\{[^}]*font-size:\s*var\(--font-ui-large\)/s);

  const explanation = css.match(/\.quizcraft-explanation\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.match(explanation, /background:\s*var\(--background-primary\)/);
  assert.match(explanation, /border:\s*1px solid color-mix\(in srgb, var\(--quizcraft-accent\)/);
  assert.doesNotMatch(explanation, /var\(--quizcraft-success\)/);

  assert.match(controller, /const explanation = card\.createDiv\(\{ cls: "quizcraft-explanation" \}\);\s*explanation\.createDiv\(\{ cls: "quizcraft-explanation-label", text: "Explanation" \}\);\s*this\.renderMarkdown\(question\.explanation, explanation\)/s);
  assert.match(css, /\.quizcraft-explanation-label\s*\{[^}]*margin-bottom:\s*0\.5rem[^}]*font-size:\s*var\(--font-ui-small\)[^}]*font-weight:\s*var\(--font-semibold\)/s);
});

test("matching card text remains selectable", () => {
  const css = read("styles.css");

  assert.match(css, /\.quizcraft-match-content\s*\{[^}]*user-select:\s*text/s);
});

test("avoids Obsidian source-lint violations in validated models and renderers", () => {
  const model = read("src/model.ts");
  const matching = read("src/renderers/matching-renderer.ts");
  const ordering = read("src/renderers/ordering-renderer.ts");

  assert.doesNotMatch(model, /as string\[\]|as number\[\]|input\.title as string/);
  assert.doesNotMatch(matching, /(?<!\.)\brequestAnimationFrame\(|document\.createElement\("span"\)/);
  assert.doesNotMatch(ordering, /(?<!\.)\brequestAnimationFrame\(|\.style\.(?:transition|transform)\s*=/);
  assert.match(ordering, /setCssProps\(\{ "--quizcraft-order-offset":/);
});

test("documents all types and keeps styles scoped", () => {
  const readme = read("README.md");
  const css = read("styles.css");
  for (const type of ["single", "multiple", "matching", "ordering"]) {
    assert.match(readme, new RegExp(`type: ${type}`));
  }
  assert.match(readme, /```quizcraft/);
  assert.match(css, /\.quizcraft-matching/);
  assert.match(css, /\.quizcraft-ordering/);
  assert.match(css, /\.quizcraft-pager/);
  assert.match(css, /\.quizcraft-match-port/);
  assert.match(css, /\.quizcraft-match-column:first-of-type \.quizcraft-match-port\s*\{[^}]*right:\s*0/s);
  assert.match(css, /\.quizcraft-match-column:nth-of-type\(2\) \.quizcraft-match-port\s*\{[^}]*left:\s*0/s);
  assert.match(css, /\.quizcraft-option::after\s*\{[^}]*position:\s*absolute[^}]*top:/s);
  assert.match(css, /\.quizcraft-option\s*\{[^}]*--quizcraft-option-background:\s*transparent[^}]*background:\s*var\(--quizcraft-option-background\)/s);
  assert.match(css, /\.quizcraft \.quizcraft-match-card\s*\{[^}]*background:\s*var\(--background-primary\)/s);
  assert.match(css, /\.quizcraft-order-card\s*\{[^}]*background:\s*transparent/s);
  assert.match(css, /\.quizcraft \.quizcraft-question-reset\s*\{[^}]*--interactive-normal:\s*transparent[^}]*background:\s*var\(--interactive-normal\)[^}]*border:\s*(?:0|none|1px solid transparent)[^}]*box-shadow:\s*none/s);
  assert.match(css, /\.quizcraft \.quizcraft-previous,\s*\.quizcraft \.quizcraft-next\s*\{[^}]*--interactive-normal:\s*transparent[^}]*background:\s*var\(--interactive-normal\)[^}]*border:\s*(?:0|none|1px solid transparent)[^}]*box-shadow:\s*none/s);
  assert.doesNotMatch(css, /input\[type="checkbox"\]:checked[^}]*\{[^}]*--quizcraft-option-background:\s*color-mix/s);
  assert.match(css, /\.quizcraft-option\.is-correct\s*\{[^}]*--quizcraft-option-border:\s*color-mix/s);
  assert.match(css, /\.quizcraft-option\.is-incorrect\s*\{[^}]*--quizcraft-option-border:\s*color-mix/s);
  assert.match(css, /\.quizcraft \.quizcraft-match-card:hover:not\(:disabled\)\s*\{[^}]*background:\s*var\(--background-primary\)/s);
  assert.match(css, /\.quizcraft \.quizcraft-match-card\.is-pending\s*\{[^}]*background:\s*var\(--background-primary\)/s);
  assert.match(css, /\.quizcraft-match-card\.is-pending:hover:not\(:disabled\),\s*\.quizcraft-match-card\.is-connected:hover:not\(:disabled\)\s*\{[^}]*border-color:\s*var\(--quizcraft-accent\)[^}]*box-shadow:\s*0 0 0 1px var\(--quizcraft-accent\),\s*0 0 10px color-mix\(in srgb, var\(--quizcraft-accent\) 20%, transparent\)/s);
  assert.match(css, /\.quizcraft \.quizcraft-match-card\.is-correct\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--quizcraft-success\)[^}]*border-color:\s*var\(--quizcraft-success\)/s);
  assert.match(css, /\.quizcraft \.quizcraft-match-card\.is-incorrect\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--quizcraft-danger\)[^}]*border-color:\s*var\(--quizcraft-danger\)/s);
  assert.match(css, /\.quizcraft \.quizcraft-match-card\.is-correct:hover\s*\{[^}]*box-shadow:[^}]*var\(--quizcraft-success\)/s);
  assert.match(css, /\.quizcraft \.quizcraft-match-card\.is-incorrect:hover\s*\{[^}]*box-shadow:[^}]*var\(--quizcraft-danger\)/s);
  assert.match(css, /\.quizcraft-option\.is-correct:hover[\s\S]*box-shadow:[^}]*var\(--quizcraft-success\)/);
  assert.match(css, /\.quizcraft-option\.is-incorrect:hover[\s\S]*box-shadow:[^}]*var\(--quizcraft-danger\)/);
  assert.match(css, /\.quizcraft-option\.is-correct input[\s\S]*accent-color:\s*var\(--quizcraft-success\)[^}]*border-color:\s*var\(--quizcraft-success\)/);
  assert.match(css, /\.quizcraft-option\.is-incorrect input[\s\S]*accent-color:\s*var\(--quizcraft-danger\)[^}]*border-color:\s*var\(--quizcraft-danger\)/);
  assert.match(css, /\.quizcraft \.quizcraft-option\.is-correct input:checked[\s\S]*background-color:\s*var\(--quizcraft-success\)[^}]*border-color:\s*var\(--quizcraft-success\)/);
  assert.match(css, /\.quizcraft \.quizcraft-option\.is-incorrect input:checked[\s\S]*background-color:\s*var\(--quizcraft-danger\)[^}]*border-color:\s*var\(--quizcraft-danger\)/);
  assert.match(css, /\.quizcraft-order-card:hover:not\(\.is-correct\):not\(\.is-incorrect\)[\s\S]*border-color:\s*var\(--quizcraft-border-hover\)/);
  assert.match(css, /\.quizcraft-order-card\.is-correct:hover[\s\S]*box-shadow:[^}]*var\(--quizcraft-success\)/);
  assert.match(css, /\.quizcraft-order-card\.is-incorrect:hover[\s\S]*box-shadow:[^}]*var\(--quizcraft-danger\)/);
  assert.match(css, /\.quizcraft-order-index\s*\{[^}]*background:\s*transparent[^}]*border:\s*1px solid var\(--quizcraft-border\)/s);
  assert.match(css, /\.quizcraft-order-card\.is-dragging\s*\{[^}]*background:\s*transparent[^}]*border:\s*1px dashed var\(--quizcraft-accent\)[^}]*box-shadow:\s*none/s);
  assert.match(css, /\.quizcraft-order-card\.is-dragging > \*\s*\{[^}]*visibility:\s*hidden/s);
  assert.match(css, /\.quizcraft-order-card\.is-reordering[\s\S]*transition:\s*transform/);
  assert.match(css, /\.quizcraft-order-card\.is-reordering\.is-reordering-from\s*\{[^}]*transition:\s*none/s);
  assert.match(css, /\.quizcraft-option\.is-disabled,\s*\.quizcraft \.quizcraft-match-card:disabled,\s*\.quizcraft-order-card\.is-correct,\s*\.quizcraft-order-card\.is-incorrect\s*\{[^}]*cursor:\s*default[^}]*user-select:\s*none/s);
  assert.match(css, /\.quizcraft-option input:disabled\s*\{[^}]*cursor:\s*default/s);
  assert.match(css, /\.quizcraft-question-type,\s*\.quizcraft-status\s*\{[^}]*display:\s*inline-flex[^}]*padding:\s*0\.25rem 0\.6rem[^}]*border-radius:\s*999px/s);
  assert.match(css, /\.quizcraft-question-type\s*\{[^}]*background:\s*transparent[^}]*border:\s*1px solid var\(--quizcraft-border\)/s);
  assert.match(css, /\.quizcraft \.quizcraft-match-card\s*\{[^}]*appearance:\s*none[^}]*background(?:-color)?:\s*var\(--background-primary\)/s);
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*\.quizcraft \.quizcraft-match-card\s*\{[^}]*padding-inline:\s*0\.7rem/s);
  assert.match(css, /\.quizcraft-question-reset\s*\{[^}]*appearance:\s*none/s);
  assert.match(css, /\.quizcraft \.quizcraft-previous,\s*\.quizcraft \.quizcraft-next\s*\{[^}]*appearance:\s*none/s);
  assert.match(css, /\.quizcraft-completion/);
  assert.match(css, /input\[type="checkbox"\][^{]*\{[^}]*border-radius:\s*(?:0|2px|3px|4px)/s);
  assert.match(css, /cursor:\s*pointer/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.quizcraft \.quizcraft-option input,[\s\S]*\{[^}]*transition:\s*none/s);
});

test("avoids discouraged CSS selectors and overrides", () => {
  const css = read("styles.css");

  assert.doesNotMatch(css, /:has\(/);
  assert.doesNotMatch(css, /!important/);
  assert.match(css, /\.quizcraft-option\.has-focus-visible/);
  assert.match(css, /\.quizcraft-option\.is-selected/);
  assert.match(css, /\.quizcraft-option\.is-disabled/);
});
