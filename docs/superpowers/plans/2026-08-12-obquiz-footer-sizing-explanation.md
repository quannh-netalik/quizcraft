# Obquiz Footer Sizing and Explanation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all four footer buttons equal dimensions and restyle explanations with the theme background and an accent border.

**Architecture:** Make a CSS-only production change under existing `.obquiz-*` selectors. Extend the package CSS contract test, rebuild the existing release artifact, and synchronize only the three publishable plugin files.

**Tech Stack:** CSS, Node test runner, TypeScript/esbuild build pipeline, Obsidian community-plugin artifacts.

## Global Constraints

- Do not commit any changes.
- Add no dependencies.
- Do not change controller logic, quiz state, schemas, renderers, or scoring.
- Keep every style scoped under `.obquiz`.
- Preserve mouse, touch, keyboard, and accessible-label behavior.

---

### Task 1: Define and implement the styling contract

**Files:**
- Modify: `tests/package.test.cjs`
- Modify: `styles.css`

**Interfaces:**
- Consumes: existing `.obquiz-question-reset`, `.obquiz-previous`, `.obquiz-next`, `.obquiz-check`, and `.obquiz-explanation` selectors.
- Produces: equal `3.75rem × 2.75rem` footer controls, enlarged symbol text, and a theme-background explanation with a softened accent border.

- [ ] **Step 1: Add failing CSS assertions**

Assert that all four footer controls share `width: 3.75rem` and `min-height: 2.75rem`; that reset and navigation symbols use a larger font size; and that `.obquiz-explanation` uses `var(--background-primary)` with an accent-derived border and no success-derived background or border.

- [ ] **Step 2: Run the suite and verify RED**

Run: `npm test`

Expected: the new CSS contract test fails because the controls currently have different widths and the explanation uses success-derived colors.

- [ ] **Step 3: Apply the minimal CSS change**

Create one grouped sizing rule for `.obquiz-question-reset`, `.obquiz-previous`, `.obquiz-next`, and `.obquiz-check`. Set both `width` and `min-width` to `3.75rem`, and `min-height` to `2.75rem`. Set the three symbol controls to `font-size: var(--font-ui-large)`. Remove the narrow-screen `Check` width override. Change `.obquiz-explanation` to `background: var(--background-primary)` and a `color-mix()` border derived from `var(--obquiz-accent)` and `var(--obquiz-border)`.

- [ ] **Step 4: Run the suite and verify GREEN**

Run: `npm test`

Expected: all tests pass.

### Task 2: Add the explanation label

**Files:**
- Modify: `tests/package.test.cjs`
- Modify: `src/quiz-controller.ts`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `QuizController.renderQuestionOutcome()` and the existing `.obquiz-explanation` container.
- Produces: a real `.obquiz-explanation-label` element containing `Explanation` before rendered Markdown.

- [ ] **Step 1: Add failing label assertions**

Assert that `renderQuestionOutcome()` creates `.obquiz-explanation-label` with
the exact text `Explanation` before calling `renderMarkdown()`. Assert that the
label CSS uses `var(--font-ui-small)`, `var(--font-semibold)`, and bottom spacing.

- [ ] **Step 2: Run the suite and verify RED**

Run: `npm test`

Expected: the label contract fails because no label element or styling exists.

- [ ] **Step 3: Implement the label**

Create the label inside `.obquiz-explanation` immediately before rendering the
Markdown explanation. Add a scoped label rule with small, semibold UI text and
`margin-bottom: 0.5rem`.

- [ ] **Step 4: Run the suite and verify GREEN**

Run: `npm test`

Expected: all tests pass.

### Task 3: Build and install the verified artifacts

**Files:**
- Build: `main.js`
- Copy: `main.js`, `manifest.json`, `styles.css`
- Destination: `../.obsidian/plugins/obquiz/`

**Interfaces:**
- Consumes: verified source styles and existing production build pipeline.
- Produces: installed plugin artifacts identical to their source counterparts.

- [ ] **Step 1: Build the plugin**

Run: `npm run build`

Expected: TypeScript and esbuild complete with exit code 0.

- [ ] **Step 2: Copy only release artifacts**

Copy `main.js`, `manifest.json`, and `styles.css` into `../.obsidian/plugins/obquiz/`.

- [ ] **Step 3: Verify source and installed artifacts**

Run byte-for-byte comparisons for all three file pairs and `git diff --check` for the source worktree.

Expected: all comparisons and whitespace checks exit with code 0; no commit is created.
