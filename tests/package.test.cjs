const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("has publishable Obsidian package metadata", () => {
  const pkg = JSON.parse(read("package.json"));
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(pkg.name, "obquiz");
  assert.equal(pkg.main, "main.js");
  assert.deepEqual(pkg.files, ["main.js", "manifest.json", "styles.css", "README.md"]);
  assert.ok(pkg.scripts.dev && pkg.scripts.build && pkg.scripts.test);
  assert.equal(manifest.id, "obquiz");
  assert.equal(manifest.name, "Obsidian Quiz");
  assert.equal(manifest.isDesktopOnly, false);
});

test("registers the obquiz processor and every renderer", () => {
  const source = read("src/main.ts");
  assert.match(source, /registerMarkdownCodeBlockProcessor\("obquiz"/);
  assert.match(source, /parseYaml/);
  for (const renderer of ["renderSingle", "renderMultiple", "renderMatching", "renderOrdering"]) {
    assert.match(source, new RegExp(`${renderer}\\(`));
  }
  assert.match(source, /MarkdownRenderer\.render/);
  assert.match(source, /next\.disabled\s*=.*state\.checked/);
  assert.match(source, /ResizeObserver/);
  assert.match(source, /renderCompletion\(/);
  assert.match(source, /resetAll\(/);
  assert.match(source, /obquiz-question-reset/);
  assert.match(source, /text:\s*"[^"]*Reset"/);
  assert.match(source, /resetCurrent\(\)/);
  assert.doesNotMatch(source, /obquiz-question-retry/);
  assert.doesNotMatch(source, /Not quite\. Try again\./);
  assert.match(source, /data-obquiz-port/);
  assert.match(source, /marker-end/);
  assert.match(source, /markerWidth",\s*"6"/);
  assert.match(source, /markerHeight",\s*"6"/);
  assert.match(source, /C \$\{/);
  assert.match(source, /updateMatchingSelection/);
  assert.match(source, /selection\.action === "connected"[\s\S]*showQuestion/);
  assert.match(source, /else refreshMatchingState\(\)/);
  assert.match(source, /dragover[\s\S]*getBoundingClientRect\(\)[\s\S]*clientY[\s\S]*moveItem/);
  assert.match(source, /animateOrderingCards/);
  assert.match(source, /dragFrame\s*=\s*requestAnimationFrame\([\s\S]*addClass\("is-dragging"\)/);
  assert.match(source, /cancelAnimationFrame\(dragFrame\)/);
  assert.match(source, /hasClass\("is-dragging"\)[\s\S]*return/);
  assert.match(source, /choiceOrder:\s*number\[\]/);
  assert.match(source, /state\.choiceOrder\.forEach\(\(optionIndex, displayIndex\)/);
  assert.match(source, /text:\s*String\.fromCharCode\(65 \+ displayIndex\)/);
  assert.match(source, /this\.states\[this\.index\]\s*=\s*this\.newState\(question, state\)/);
  assert.match(source, /reshuffledOrder\(previous\.choiceOrder\)/);
  assert.match(source, /reshuffledOrder\(previous\.matchOrder\)/);
  assert.match(source, /reshuffledOrder\(previous\.order\)/);
  for (const label of ["Single Choice", "Multiple Choice", "Matching", "Ordering"]) {
    assert.match(source, new RegExp(`"${label}"`));
  }
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
  assert.match(css, /\.obquiz-previous\s*\{[^}]*background:\s*transparent[^}]*border:\s*(?:0|none|1px solid transparent)[^}]*box-shadow:\s*none/s);
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
  assert.match(css, /\.obquiz-previous\s*\{[^}]*appearance:\s*none/s);
  assert.match(css, /\.obquiz-completion/);
  assert.match(css, /input\[type="checkbox"\][^{]*\{[^}]*border-radius:\s*(?:0|2px|3px|4px)/s);
  assert.match(css, /cursor:\s*pointer/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
