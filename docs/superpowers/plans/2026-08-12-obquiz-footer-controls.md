# Obquiz Footer Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current header reset and labeled pager with a stable footer containing icon-only reset, compact navigation and progress, and a persistent `Check` button.

**Architecture:** Keep all coordination in `QuizController`; build the footer once per question in `renderPager()` and remove question action construction from the header/outcome methods. Keep styling under existing `.obquiz-*` selectors and preserve all state and scoring logic.

**Tech Stack:** TypeScript, Obsidian DOM helpers, CSS, Node test runner, esbuild.

## Global Constraints

- Do not commit any changes.
- Add no dependencies.
- Preserve quiz schema, renderers, scoring, and question-state behavior.
- Preserve mouse, touch, and keyboard access.
- Keep all styles scoped under `.obquiz`.

---

### Task 1: Define the footer contract with focused tests

**Files:**
- Modify: `tests/package.test.cjs`

**Interfaces:**
- Consumes: `src/quiz-controller.ts` and `styles.css` as package source text.
- Produces: regression assertions for footer labels, progress markup, accessibility labels, and four-part layout.

- [ ] **Step 1: Add failing assertions**

Assert that the controller uses `↻`, `Check`, `<`, and `>`; supplies reset/previous/next ARIA labels; creates separate `.obquiz-progress-current` and `.obquiz-progress-total` elements; and no longer contains `Check Answer`, `‹ Previous`, `Next ›`, or `Question ... of ...` pager copy. Assert that CSS gives `.obquiz-progress-current` bold weight and the footer a reset/center/check layout.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --test-name-pattern="footer"`

Expected: FAIL because the current controller still renders the old header reset, `Check Answer`, labeled navigation, and a plain-text progress string.

### Task 2: Build the stable footer

**Files:**
- Modify: `src/quiz-controller.ts`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `QuizController.index`, `QuizController.states`, `isQuestionReady()`, `resetCurrent()`, `checkCurrent()`, `showQuestion()`, and `renderCompletion()`.
- Produces: `.obquiz-question-reset`, `.obquiz-navigation`, `.obquiz-previous`, `.obquiz-progress`, `.obquiz-progress-current`, `.obquiz-progress-total`, `.obquiz-next`, and `.obquiz-check` footer controls.

- [ ] **Step 1: Implement minimal controller changes**

Remove reset creation from `renderHeader()`. Stop creating actions in `renderQuestionOutcome()`; that method should only render checked explanations. In `renderPager()`, create reset, centered navigation/progress, and `Check`. Keep `Check` disabled when the response is incomplete or already checked. Keep `>` disabled until checked and route the final checked question to completion.

- [ ] **Step 2: Implement minimal CSS changes**

Change `.obquiz-pager` to a three-column layout with fixed edge areas and centered navigation. Style icon navigation as transparent controls, use bold weight only on `.obquiz-progress-current`, and keep a stable right-side `Check` width. Retain narrow-screen alignment without introducing horizontal overflow.

- [ ] **Step 3: Run the focused test and verify GREEN**

Run: `npm test -- --test-name-pattern="footer"`

Expected: PASS.

### Task 3: Align documentation and verify the plugin

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: the implemented footer behavior.
- Produces: accurate interaction documentation.

- [ ] **Step 1: Update interaction copy**

Document `<`, `>`, `Check`, and the footer reset location while preserving the existing navigation and completion rules.

- [ ] **Step 2: Run full required checks**

Run: `npm test`

Expected: all tests pass with zero failures.

Run: `npm run build`

Expected: TypeScript and the production bundle complete with exit code 0.

- [ ] **Step 3: Inspect the final diff**

Run: `git diff --check` if the folder is in a Git worktree; otherwise inspect the changed files directly for unintended edits. Confirm no commit was created.
